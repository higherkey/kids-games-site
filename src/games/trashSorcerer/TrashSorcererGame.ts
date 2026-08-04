import type { Game } from '../../core/Game';
import { AudioController } from '../../core/AudioController';
import { HapticController } from '../../core/HapticController';
import { Engine, World, Bodies, Body, Vector, Events } from 'matter-js';

export type TrashCategory = 'RECYCLING' | 'COMPOST' | 'TRASH';

export interface TrashItem {
  id: number;
  body: Body;
  category: TrashCategory;
  name: string;
  icon: string;
  color: string;
  radius: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  life: number;
  maxLife: number;
}

interface Portal {
  category: TrashCategory;
  name: string;
  icon: string;
  color: string;
  x: number;
  y: number;
  radius: number;
  sensorBody: Body;
}

const TRASH_TEMPLATES: Array<{ category: TrashCategory; name: string; icon: string; color: string }> = [
  { category: 'RECYCLING', name: 'Can', icon: '🥫', color: '#6BCBFF' },
  { category: 'RECYCLING', name: 'Paper', icon: '📄', color: '#6BCBFF' },
  { category: 'RECYCLING', name: 'Bottle', icon: '🍾', color: '#6BCBFF' },
  { category: 'COMPOST', name: 'Apple', icon: '🍎', color: '#34D399' },
  { category: 'COMPOST', name: 'Banana', icon: '🍌', color: '#34D399' },
  { category: 'COMPOST', name: 'Leaf', icon: '🍂', color: '#34D399' },
  { category: 'TRASH', name: 'Battery', icon: '🔋', color: '#FF5E5E' },
  { category: 'TRASH', name: 'Bag', icon: '🛍️', color: '#FF5E5E' },
];

export class TrashSorcererGame implements Game {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private audio: AudioController;
  private haptics: HapticController;

  private engine: Engine | null = null;
  private world: World | null = null;

  private trashItems: TrashItem[] = [];
  private portals: Portal[] = [];
  private particles: Particle[] = [];

  private score = 0;
  private spawnTimer = 0;
  private spawnInterval = 1800; // ms
  private paused = false;
  private nextItemId = 1;

  private draggingItem: TrashItem | null = null;
  private dragStartPos = { x: 0, y: 0 };
  private dragStartTime = 0;

  constructor() {
    this.audio = AudioController.getInstance();
    this.haptics = HapticController.getInstance();
    this.audio.registerSound('pop', '/sounds/pop.ogg');
    this.audio.registerSound('star', '/sounds/pop.ogg');
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.score = 0;
    this.spawnTimer = 0;
    this.trashItems = [];
    this.particles = [];
    this.paused = false;

    this.engine = Engine.create();
    this.world = this.engine.world;
    this.engine.gravity.y = 0.4; // Light gravity for easy flicking

    this.setupPortals();
    this.setupCollisionHandlers();

    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mouseup', this.handleMouseUp);
    canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
  }

  private setupPortals() {
    if (!this.canvas || !this.world) return;

    const w = this.canvas.width;
    const portalY = 100;
    const portalRadius = 42;
    const spacing = w / 4;

    const portalConfigs: Array<{ category: TrashCategory; name: string; icon: string; color: string; x: number }> = [
      { category: 'RECYCLING', name: 'Recycle', icon: '♻️', color: '#6BCBFF', x: spacing },
      { category: 'COMPOST', name: 'Compost', icon: '🌱', color: '#34D399', x: spacing * 2 },
      { category: 'TRASH', name: 'Trash', icon: '🗑️', color: '#FF5E5E', x: spacing * 3 },
    ];

    this.portals = portalConfigs.map(cfg => {
      const sensorBody = Bodies.circle(cfg.x, portalY, portalRadius, {
        isStatic: true,
        isSensor: true,
      });

      World.add(this.world!, sensorBody);

      return {
        ...cfg,
        y: portalY,
        radius: portalRadius,
        sensorBody,
      };
    });
  }

  private setupCollisionHandlers() {
    if (!this.engine) return;

    Events.on(this.engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const item = this.trashItems.find(i => i.body.id === pair.bodyA.id || i.body.id === pair.bodyB.id);
        if (!item) return;

        const otherBody = item.body.id === pair.bodyA.id ? pair.bodyB : pair.bodyA;
        const portal = this.portals.find(p => p.sensorBody.id === otherBody.id);

        if (portal) {
          this.handlePortalEntry(item, portal);
        }
      });
    });
  }

  private handlePortalEntry(item: TrashItem, portal: Portal) {
    // Remove item from world
    if (this.world) {
      World.remove(this.world, item.body);
    }
    this.trashItems = this.trashItems.filter(i => i.id !== item.id);

    if (item.category === portal.category) {
      this.score += 10;
      this.audio.play('star');
      this.haptics.lightTap();
      this.createBurst(portal.x, portal.y, portal.color, 35);
    } else {
      this.score = Math.max(0, this.score - 5);
      this.audio.play('pop');
      this.haptics.lightTap();
      this.createBurst(portal.x, portal.y, '#555555', 12);
    }
  }

  private spawnTrash() {
    if (!this.canvas || !this.world) return;

    const template = TRASH_TEMPLATES[Math.floor(Math.random() * TRASH_TEMPLATES.length)];
    const radius = 28;
    const spawnX = Math.random() * (this.canvas.width - 100) + 50;
    const spawnY = this.canvas.height - 80;

    const body = Bodies.circle(spawnX, spawnY, radius, {
      friction: 0.1,
      restitution: 0.6,
      density: 0.001,
    });

    // Initial upward velocity so items float up into view
    Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 4,
      y: -(Math.random() * 5 + 6),
    });

    const item: TrashItem = {
      id: this.nextItemId++,
      body,
      category: template.category,
      name: template.name,
      icon: template.icon,
      color: template.color,
      radius,
    };

    World.add(this.world, body);
    this.trashItems.push(item);
  }

  private handleMouseDown = (e: MouseEvent) => {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.startPress(pos.x, pos.y);
  };

  private handleMouseMove = (e: MouseEvent) => {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.movePress(pos.x, pos.y);
  };

  private handleMouseUp = (e: MouseEvent) => {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.endPress(pos.x, pos.y);
  };

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const pos = this.getCanvasPos(touch.clientX, touch.clientY);
    this.startPress(pos.x, pos.y);
  };

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const pos = this.getCanvasPos(touch.clientX, touch.clientY);
    this.movePress(pos.x, pos.y);
  };

  private handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const pos = this.getCanvasPos(touch.clientX, touch.clientY);
    this.endPress(pos.x, pos.y);
  };

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  private startPress(x: number, y: number) {
    for (let i = this.trashItems.length - 1; i >= 0; i--) {
      const item = this.trashItems[i];
      const dist = Math.sqrt((x - item.body.position.x) ** 2 + (y - item.body.position.y) ** 2);
      if (dist < item.radius + 15) {
        this.draggingItem = item;
        this.dragStartPos = { x, y };
        this.dragStartTime = performance.now();
        Body.setStatic(item.body, true);
        this.haptics.lightTap();
        break;
      }
    }
  }

  private movePress(x: number, y: number) {
    if (this.draggingItem) {
      Body.setPosition(this.draggingItem.body, { x, y });
    }
  }

  private endPress(x: number, y: number) {
    if (this.draggingItem) {
      Body.setStatic(this.draggingItem.body, false);

      const dt = Math.max(16, performance.now() - this.dragStartTime);
      const vx = ((x - this.dragStartPos.x) / dt) * 15;
      const vy = ((y - this.dragStartPos.y) / dt) * 15;

      // Apply flick velocity to object
      Body.setVelocity(this.draggingItem.body, {
        x: Math.max(-25, Math.min(25, vx)),
        y: Math.max(-25, Math.min(25, vy)),
      });

      this.draggingItem = null;
      this.audio.play('pop');
      this.haptics.lightTap();
    }
  }

  private createBurst(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 3 + Math.random() * 4,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
      });
    }
  }

  update(dt: number): void {
    if (!this.engine || !this.world || this.paused) return;

    const dtSec = dt / 1000;
    Engine.update(this.engine, Math.min(30, dt));

    // Spawn trash items periodically
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval && this.trashItems.length < 8) {
      this.spawnTimer = 0;
      this.spawnTrash();
    }

    // Clean up out of bounds trash items
    if (this.canvas) {
      for (let i = this.trashItems.length - 1; i >= 0; i--) {
        const item = this.trashItems[i];
        if (item.body.position.y > this.canvas.height + 60 || item.body.position.y < -100) {
          World.remove(this.world, item.body);
          this.trashItems.splice(i, 1);
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.life -= dtSec;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.render();
  }

  private render() {
    if (!this.ctx || !this.canvas) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = '#111827';
    this.ctx.fillRect(0, 0, w, h);

    // Score Header
    this.ctx.fillStyle = '#FFE66D';
    this.ctx.font = 'bold 24px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`TRASH SORCERER  |  SCORE: ${this.score}`, w / 2, 35);

    // Portals
    this.portals.forEach(p => {
      this.ctx!.fillStyle = p.color;
      this.ctx!.strokeStyle = '#ffffff';
      this.ctx!.lineWidth = 3;

      this.ctx!.beginPath();
      this.ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx!.fill();
      this.ctx!.stroke();

      this.ctx!.font = '28px sans-serif';
      this.ctx!.textAlign = 'center';
      this.ctx!.textBaseline = 'middle';
      this.ctx!.fillText(p.icon, p.x, p.y - 4);

      this.ctx!.fillStyle = '#ffffff';
      this.ctx!.font = 'bold 12px Fredoka, sans-serif';
      this.ctx!.fillText(p.name, p.x, p.y + p.radius + 14);
    });

    // Trash Items
    this.trashItems.forEach(item => {
      this.ctx!.save();
      this.ctx!.translate(item.body.position.x, item.body.position.y);
      this.ctx!.rotate(item.body.angle);

      this.ctx!.fillStyle = item.color;
      this.ctx!.strokeStyle = '#ffffff';
      this.ctx!.lineWidth = 2.5;

      this.ctx!.beginPath();
      this.ctx!.arc(0, 0, item.radius, 0, Math.PI * 2);
      this.ctx!.fill();
      this.ctx!.stroke();

      this.ctx!.font = '24px sans-serif';
      this.ctx!.textAlign = 'center';
      this.ctx!.textBaseline = 'middle';
      this.ctx!.fillText(item.icon, 0, 0);

      this.ctx!.restore();
    });

    // Particles
    this.particles.forEach(p => {
      this.ctx!.fillStyle = p.color;
      this.ctx!.globalAlpha = Math.max(0, p.life / p.maxLife);
      this.ctx!.beginPath();
      this.ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx!.fill();
    });
    this.ctx.globalAlpha = 1.0;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  destroy(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this.canvas.removeEventListener('mouseup', this.handleMouseUp);
      this.canvas.removeEventListener('touchstart', this.handleTouchStart);
      this.canvas.removeEventListener('touchmove', this.handleTouchMove);
      this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    }
    if (this.engine) {
      Events.off(this.engine, 'collisionStart');
    }
    if (this.world) {
      World.clear(this.world, false);
    }
    this.engine = null;
    this.world = null;
    this.trashItems = [];
    this.portals = [];
    this.particles = [];
  }
}
