import type { Game } from '../../core/Game';
import { AudioController } from '../../core/AudioController';
import { HapticController } from '../../core/HapticController';
import { Engine, World, Bodies, Body, Vector, Events } from 'matter-js';

export interface TowerBlock {
  id: number;
  body: Body;
  value: number;
  shape: 'square' | 'rect' | 'circle';
  color: string;
  width: number;
  height: number;
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

const BLOCK_COLORS = [
  '#FF5E5E', '#FF85B3', '#FB923C', '#FFE66D',
  '#34D399', '#4ECDC4', '#6BCBFF', '#A78BFA',
];

export class EquationTowerGame implements Game {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private audio: AudioController;
  private haptics: HapticController;

  private engine: Engine | null = null;
  private world: World | null = null;

  private blocks: TowerBlock[] = [];
  private particles: Particle[] = [];
  private platformBody: Body | null = null;
  private groundBody: Body | null = null;

  private targetSum = 10;
  private currentSum = 0;
  private level = 1;
  private gameWon = false;
  private paused = false;
  private winAnimationTimer = 0;

  private draggingBlock: TowerBlock | null = null;
  private dragOffset = { x: 0, y: 0 };
  private nextBlockId = 1;

  private paletteBlocks: Array<{ value: number; shape: 'square' | 'rect' | 'circle'; color: string }> = [];

  constructor() {
    this.audio = AudioController.getInstance();
    this.haptics = HapticController.getInstance();
    this.audio.registerSound('pop', '/sounds/pop.ogg');
    this.audio.registerSound('win', '/sounds/pop.ogg');
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.blocks = [];
    this.particles = [];
    this.gameWon = false;
    this.winAnimationTimer = 0;
    this.paused = false;
    this.level = 1;
    this.targetSum = 10;

    this.engine = Engine.create();
    this.world = this.engine.world;
    this.engine.gravity.y = 1.0;

    this.setupEnvironment();
    this.setupPalette();
    this.setupCollisionHandlers();

    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mouseup', this.handleMouseUp);
    canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
  }

  private setupEnvironment() {
    if (!this.canvas || !this.world) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Ground
    this.groundBody = Bodies.rectangle(w / 2, h - 20, w, 40, { isStatic: true, friction: 0.8 });
    
    // Balance platform sitting in center lower screen
    const platformWidth = Math.min(320, w * 0.7);
    const platformY = h - 120;
    this.platformBody = Bodies.rectangle(w / 2, platformY, platformWidth, 24, {
      isStatic: true,
      friction: 0.9,
      restitution: 0.1,
    });

    // Side walls to prevent easy falling off-screen
    const leftWall = Bodies.rectangle(-10, h / 2, 20, h, { isStatic: true });
    const rightWall = Bodies.rectangle(w + 10, h / 2, 20, h, { isStatic: true });

    World.add(this.world, [this.groundBody, this.platformBody, leftWall, rightWall]);
  }

  private setupPalette() {
    this.generateTargetAndPalette();
  }

  private generateTargetAndPalette() {
    // Generate a fun equation target based on level
    const targets = [6, 10, 12, 15, 20];
    this.targetSum = targets[(this.level - 1) % targets.length];
    
    const possibleValues = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const shapes: Array<'square' | 'rect' | 'circle'> = ['square', 'rect', 'circle'];
    
    this.paletteBlocks = [];
    for (let i = 0; i < 5; i++) {
      const value = possibleValues[Math.floor(Math.random() * possibleValues.length)];
      const shape = shapes[i % shapes.length];
      const color = BLOCK_COLORS[i % BLOCK_COLORS.length];
      this.paletteBlocks.push({ value, shape, color });
    }
  }

  private setupCollisionHandlers() {
    if (!this.engine) return;

    Events.on(this.engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const blockA = this.blocks.find(b => b.body.id === pair.bodyA.id);
        const blockB = this.blocks.find(b => b.body.id === pair.bodyB.id);

        if (blockA || blockB) {
          this.haptics.lightTap();
          this.audio.play('pop');
          const pos = blockA ? blockA.body.position : blockB!.body.position;
          this.createSparks(pos.x, pos.y, '#ffffff', 4);
        }
      });
    });
  }

  private spawnBlock(template: { value: number; shape: 'square' | 'rect' | 'circle'; color: string }, x: number, y: number) {
    if (!this.world) return;

    let width = 50;
    let height = 50;
    let body: Body;

    if (template.shape === 'square') {
      width = 54;
      height = 54;
      body = Bodies.rectangle(x, y, width, height, { friction: 0.8, restitution: 0.2, density: 0.002 });
    } else if (template.shape === 'rect') {
      width = 75;
      height = 42;
      body = Bodies.rectangle(x, y, width, height, { friction: 0.8, restitution: 0.2, density: 0.002 });
    } else {
      width = 52;
      height = 52;
      body = Bodies.circle(x, y, 26, { friction: 0.8, restitution: 0.3, density: 0.002 });
    }

    const block: TowerBlock = {
      id: this.nextBlockId++,
      body,
      value: template.value,
      shape: template.shape,
      color: template.color,
      width,
      height,
    };

    World.add(this.world, body);
    this.blocks.push(block);
    this.audio.play('pop');
    this.haptics.lightTap();
  }

  private calculateCurrentSum() {
    if (!this.platformBody) return 0;
    
    // Sum blocks resting near or on top of platform (y < platformY)
    const platY = this.platformBody.position.y;
    let sum = 0;
    
    for (const b of this.blocks) {
      if (b.body.position.y <= platY + 20) {
        sum += b.value;
      }
    }
    
    this.currentSum = sum;
    if (this.currentSum === this.targetSum && !this.gameWon) {
      this.triggerWin();
    }
  }

  private triggerWin() {
    this.gameWon = true;
    this.winAnimationTimer = 0;
    this.audio.play('win');
    this.haptics.success();
    
    if (this.canvas) {
      this.createConfetti(this.canvas.width / 2, this.canvas.height / 3, 70);
    }
  }

  private nextLevel() {
    if (!this.world) return;
    this.blocks.forEach(b => World.remove(this.world!, b.body));
    this.blocks = [];
    this.gameWon = false;
    this.level++;
    this.generateTargetAndPalette();
  }

  private handleMouseDown = (e: MouseEvent) => {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.startPress(pos.x, pos.y);
  };

  private handleMouseMove = (e: MouseEvent) => {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.movePress(pos.x, pos.y);
  };

  private handleMouseUp = () => {
    this.endPress();
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
    this.endPress();
  };

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  private startPress(x: number, y: number) {
    if (!this.canvas) return;

    if (this.gameWon) {
      this.nextLevel();
      return;
    }

    // Check top palette buttons (y < 90)
    if (y < 90) {
      const paletteY = 62;
      const totalW = this.paletteBlocks.length * 65;
      const startX = (this.canvas.width - totalW) / 2;

      for (let i = 0; i < this.paletteBlocks.length; i++) {
        const btnX = startX + i * 65 + 30;
        const dist = Math.sqrt((x - btnX) ** 2 + (y - paletteY) ** 2);
        if (dist < 28) {
          this.spawnBlock(this.paletteBlocks[i], this.canvas.width / 2 + (Math.random() * 40 - 20), 120);
          return;
        }
      }
      return;
    }

    // Check if tapping existing block to drag
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const block = this.blocks[i];
      const dist = Math.sqrt((x - block.body.position.x) ** 2 + (y - block.body.position.y) ** 2);
      if (dist < 35) {
        this.draggingBlock = block;
        this.dragOffset = { x: x - block.body.position.x, y: y - block.body.position.y };
        Body.setStatic(block.body, true);
        this.haptics.lightTap();
        break;
      }
    }
  }

  private movePress(x: number, y: number) {
    if (this.draggingBlock) {
      Body.setPosition(this.draggingBlock.body, {
        x: x - this.dragOffset.x,
        y: y - this.dragOffset.y,
      });
    }
  }

  private endPress() {
    if (this.draggingBlock) {
      Body.setStatic(this.draggingBlock.body, false);
      Body.setVelocity(this.draggingBlock.body, { x: 0, y: 1 });
      this.draggingBlock = null;
    }
  }

  private createSparks(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2 + Math.random() * 3,
        life: 0.2 + Math.random() * 0.2,
        maxLife: 0.4,
      });
    }
  }

  private createConfetti(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 1.1 + Math.random() * Math.PI * 0.8;
      const speed = 80 + Math.random() * 180;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)],
        radius: 4 + Math.random() * 5,
        life: 1.2 + Math.random() * 1.0,
        maxLife: 2.2,
      });
    }
  }

  update(dt: number): void {
    if (!this.engine || !this.world || this.paused) return;

    const dtSec = dt / 1000;
    Engine.update(this.engine, Math.min(30, dt));

    this.calculateCurrentSum();

    // Clean up fallen blocks
    if (this.canvas) {
      for (let i = this.blocks.length - 1; i >= 0; i--) {
        const b = this.blocks[i];
        if (b.body.position.y > this.canvas.height + 50) {
          World.remove(this.world, b.body);
          this.blocks.splice(i, 1);
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.vy += 150 * dtSec;
      p.life -= dtSec;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.gameWon) {
      this.winAnimationTimer += dtSec;
      if (this.winAnimationTimer > 0.5 && this.particles.length < 15 && this.canvas) {
        this.createConfetti(this.canvas.width / 2, this.canvas.height / 3, 10);
        this.winAnimationTimer = 0;
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
    this.ctx.fillStyle = '#1A1A2E';
    this.ctx.fillRect(0, 0, w, h);

    // Render Goal / Target Banner
    this.drawHeaderUI();

    // Render Platform & Stand
    this.drawPlatform();

    // Render Blocks
    this.blocks.forEach((b) => {
      this.ctx!.save();
      this.ctx!.translate(b.body.position.x, b.body.position.y);
      this.ctx!.rotate(b.body.angle);

      this.ctx!.fillStyle = b.color;
      this.ctx!.strokeStyle = '#ffffff';
      this.ctx!.lineWidth = 3;

      if (b.shape === 'square' || b.shape === 'rect') {
        this.ctx!.beginPath();
        this.ctx!.roundRect(-b.width / 2, -b.height / 2, b.width, b.height, 8);
        this.ctx!.fill();
        this.ctx!.stroke();
      } else {
        this.ctx!.beginPath();
        this.ctx!.arc(0, 0, b.width / 2, 0, Math.PI * 2);
        this.ctx!.fill();
        this.ctx!.stroke();
      }

      // Value text inside block
      this.ctx!.fillStyle = '#1A1A2E';
      this.ctx!.font = 'bold 22px Fredoka, sans-serif';
      this.ctx!.textAlign = 'center';
      this.ctx!.textBaseline = 'middle';
      this.ctx!.fillText(b.value.toString(), 0, 0);

      this.ctx!.restore();
    });

    // Render Particles
    this.particles.forEach((p) => {
      this.ctx!.fillStyle = p.color;
      this.ctx!.globalAlpha = Math.max(0, p.life / p.maxLife);
      this.ctx!.beginPath();
      this.ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx!.fill();
    });
    this.ctx.globalAlpha = 1.0;

    // Win Overlay
    if (this.gameWon) {
      this.drawWinOverlay();
    }
  }

  private drawHeaderUI() {
    if (!this.ctx || !this.canvas) return;

    const w = this.canvas.width;

    // Level & Target banner
    this.ctx.fillStyle = '#2B2D5E';
    this.ctx.fillRect(0, 0, w, 85);

    this.ctx.fillStyle = '#FFE66D';
    this.ctx.font = 'bold 20px Fredoka, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Level ${this.level}`, 20, 35);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 24px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Target Sum: ${this.targetSum}  |  Current: ${this.currentSum}`, w / 2, 35);

    // Palette blocks to select/spawn
    const paletteY = 62;
    const totalW = this.paletteBlocks.length * 65;
    const startX = (w - totalW) / 2;

    this.paletteBlocks.forEach((item, i) => {
      const btnX = startX + i * 65 + 30;

      this.ctx!.fillStyle = item.color;
      this.ctx!.strokeStyle = '#ffffff';
      this.ctx!.lineWidth = 2;
      this.ctx!.beginPath();
      this.ctx!.arc(btnX, paletteY, 18, 0, Math.PI * 2);
      this.ctx!.fill();
      this.ctx!.stroke();

      this.ctx!.fillStyle = '#1A1A2E';
      this.ctx!.font = 'bold 15px Fredoka, sans-serif';
      this.ctx!.textAlign = 'center';
      this.ctx!.textBaseline = 'middle';
      this.ctx!.fillText(`+${item.value}`, btnX, paletteY);
    });
  }

  private drawPlatform() {
    if (!this.ctx || !this.platformBody || !this.canvas) return;

    const p = this.platformBody.position;
    const w = Math.min(320, this.canvas.width * 0.7);

    // Stand / Base pillar
    this.ctx.fillStyle = '#4A4E69';
    this.ctx.fillRect(p.x - 15, p.y, 30, this.canvas.height - p.y);

    // Scale platform bar
    this.ctx.fillStyle = '#9A8C98';
    this.ctx.strokeStyle = '#FFE66D';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.roundRect(p.x - w / 2, p.y - 12, w, 24, 6);
    this.ctx.fill();
    this.ctx.stroke();

    // Scale label
    this.ctx.fillStyle = '#1A1A2E';
    this.ctx.font = 'bold 14px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('BALANCE PLATFORM', p.x, p.y);
  }

  private drawWinOverlay() {
    if (!this.ctx || !this.canvas) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.fillStyle = '#FFE66D';
    this.ctx.font = 'bold 36px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('🎉 PERFECT EQUATION! 🎉', w / 2, h / 2 - 20);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px Fredoka, sans-serif';
    this.ctx.fillText('Tap anywhere for next target', w / 2, h / 2 + 30);
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
    this.blocks = [];
    this.particles = [];
  }
}
