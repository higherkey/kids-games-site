import { BaseGame } from '../../core/BaseGame';
import { Engine, World, Bodies, Body, Vector, Events } from 'matter-js';

type SandboxPartType = 'ramp' | 'bumper' | 'booster';

interface SandboxPart {
  id: number;
  type: SandboxPartType;
  body: Body;
  width?: number;
  height?: number;
  radius?: number;
  angle: number;
  scaleAnimation?: number;
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

export class MarblePipeGame extends BaseGame {
  private engine: Engine | null = null;
  private world: World | null = null;

  private parts: SandboxPart[] = [];
  private marbles: Body[] = [];
  private particles: Particle[] = [];
  private goalCupBody: Body | null = null;
  private startingFunnel = { x: 0, y: 0, width: 70, height: 60 };

  private selectedPart: SandboxPart | null = null;
  private draggingPart: SandboxPart | null = null;
  private dragOffset = { x: 0, y: 0 };
  
  private nextPartId = 1;
  private paused = false;
  private gameWon = false;
  private winAnimationTimer = 0;

  private readonly toolboxHeight = 90;
  private toolboxButtons: Array<{ type: SandboxPartType; label: string; x: number; y: number; width: number; height: number; color: string }> = [];

  constructor() {
    super();
    this.audio.registerSound('clink', '/sounds/pop.ogg');
    this.audio.registerSound('boing', '/sounds/pop.ogg');
    this.audio.registerSound('win', '/sounds/pop.ogg');
  }

  protected onInit(): void {
    if (!this.canvas) return;

    this.marbles = [];
    this.parts = [];
    this.particles = [];
    this.gameWon = false;
    this.winAnimationTimer = 0;
    this.paused = false;

    this.engine = Engine.create();
    this.world = this.engine.world;
    this.engine.gravity.y = 1.0;

    const wallOptions = { isStatic: true, friction: 0.1 };
    const leftWall = Bodies.rectangle(-10, this.canvas.height / 2, 20, this.canvas.height, wallOptions);
    const rightWall = Bodies.rectangle(this.canvas.width + 10, this.canvas.height / 2, 20, this.canvas.height, wallOptions);
    World.add(this.world, [leftWall, rightWall]);

    this.startingFunnel = {
      x: this.canvas.width * 0.25,
      y: 90,
      width: 80,
      height: 60
    };

    this.setupGoalCup();
    this.setupToolbox();
    this.setupCollisionHandlers();

    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
  }

  private setupGoalCup() {
    if (!this.canvas || !this.world) return;

    const cupX = this.canvas.width * 0.75;
    const cupY = this.canvas.height - this.toolboxHeight - 40;
    const cupWidth = 90;
    const cupHeight = 50;
    const thickness = 8;

    const leftWall = Bodies.rectangle(cupX - cupWidth / 2, cupY, thickness, cupHeight, { isStatic: true });
    const rightWall = Bodies.rectangle(cupX + cupWidth / 2, cupY, thickness, cupHeight, { isStatic: true });
    const bottom = Bodies.rectangle(cupX, cupY + cupHeight / 2 - thickness / 2, cupWidth, thickness, { isStatic: true });
    
    this.goalCupBody = Bodies.rectangle(cupX, cupY, cupWidth - 10, cupHeight - 10, {
      isStatic: true,
      isSensor: true
    });

    World.add(this.world, [leftWall, rightWall, bottom, this.goalCupBody]);
  }

  private setupToolbox() {
    if (!this.canvas) return;

    const btnWidth = Math.min(110, this.canvas.width / 4);
    const spacing = (this.canvas.width - btnWidth * 3) / 4;
    const btnY = this.canvas.height - this.toolboxHeight + 20;

    this.toolboxButtons = [
      { type: 'ramp', label: 'Ramp', x: spacing, y: btnY, width: btnWidth, height: 50, color: '#A0522D' },
      { type: 'bumper', label: 'Bumper', x: spacing * 2 + btnWidth, y: btnY, width: btnWidth, height: 50, color: '#C0392B' },
      { type: 'booster', label: 'Booster', x: spacing * 3 + btnWidth * 2, y: btnY, width: btnWidth, height: 50, color: '#2E9E6B' }
    ];
  }

  private setupCollisionHandlers() {
    if (!this.engine) return;

    Events.on(this.engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;

        const marble = this.marbles.find(m => m.id === bodyA.id || m.id === bodyB.id);
        if (!marble) return;

        const otherBody = marble.id === bodyA.id ? bodyB : bodyA;

        if (otherBody.id === this.goalCupBody?.id) {
          this.triggerWin();
          return;
        }

        const part = this.parts.find(p => p.body.id === otherBody.id);
        if (part) {
          if (part.type === 'bumper') {
            const diff = Vector.sub(marble.position, part.body.position);
            const normal = Vector.normalise(diff);
            Body.setVelocity(marble, Vector.mult(normal, 11));

            part.scaleAnimation = 1.4;
            this.audio.play('boing');
            this.haptics.lightTap();
            this.createSparks(marble.position.x, marble.position.y, '#C0392B', 12);
          } else {
            this.audio.play('clink');
            this.haptics.lightTap();
            this.createSparks(marble.position.x, marble.position.y, '#2B2D5E', 4);
          }
        }
      });
    });
  }

  private addPart(type: SandboxPartType) {
    if (!this.canvas || !this.world) return;

    const spawnX = this.canvas.width / 2;
    const spawnY = this.canvas.height / 2 - 50;

    let body: Body;
    let width = 0;
    let height = 0;
    let radius = 0;

    if (type === 'ramp') {
      width = 110;
      height = 18;
      body = Bodies.rectangle(spawnX, spawnY, width, height, { isStatic: true, friction: 0.1 });
    } else if (type === 'bumper') {
      radius = 24;
      body = Bodies.circle(spawnX, spawnY, radius, { isStatic: true, restitution: 0.8 });
    } else {
      width = 90;
      height = 14;
      body = Bodies.rectangle(spawnX, spawnY, width, height, { isStatic: true, isSensor: true });
    }

    const newPart: SandboxPart = {
      id: this.nextPartId++,
      type,
      body,
      width,
      height,
      radius,
      angle: 0
    };

    World.add(this.world, body);
    this.parts.push(newPart);
    this.selectedPart = newPart;
    this.audio.play('clink');
    this.haptics.lightTap();
  }

  private triggerWin() {
    if (this.gameWon) return;
    this.gameWon = true;
    this.winAnimationTimer = 0;
    this.audio.play('win');
    this.haptics.lightTap();
    
    if (this.canvas) {
      this.createConfetti(this.canvas.width / 2, this.canvas.height / 2, 80);
    }
  }

  private spawnMarble() {
    if (!this.world) return;

    this.marbles.forEach(m => World.remove(this.world!, m));
    this.marbles = [];
    this.gameWon = false;

    const marble = Bodies.circle(this.startingFunnel.x, this.startingFunnel.y + 40, 11, {
      friction: 0.05,
      restitution: 0.25,
      density: 0.002
    });

    World.add(this.world, marble);
    this.marbles.push(marble);
    this.audio.play('clink');
    this.haptics.lightTap();
  }

  private readonly handleMouseDown = (e: MouseEvent) => {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.startPress(pos.x, pos.y);
  };

  private readonly handleMouseMove = (e: MouseEvent) => {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.movePress(pos.x, pos.y);
  };

  private readonly handleMouseUp = () => {
    this.endPress();
  };

  private readonly handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const pos = this.getCanvasPos(touch.clientX, touch.clientY);
    this.startPress(pos.x, pos.y);
  };

  private readonly handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const pos = this.getCanvasPos(touch.clientX, touch.clientY);
    this.movePress(pos.x, pos.y);
  };

  private readonly handleTouchEnd = (e: TouchEvent) => {
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

    if (y >= this.canvas.height - this.toolboxHeight) {
      this.handleToolboxPress(x, y);
      return;
    }

    if (y < 60) {
      if (this.handleHeaderPress(x)) return;
    }

    if (this.selectedPart && this.handleSelectedPartMenu(x, y)) return;

    this.pickOrDeselectPart(x, y);
  }

  private handleToolboxPress(x: number, y: number): void {
    for (const btn of this.toolboxButtons) {
      if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
        this.addPart(btn.type);
        return;
      }
    }
  }

  private handleHeaderPress(x: number): boolean {
    if (!this.canvas) return false;
    if (x >= 20 && x <= 150) {
      this.spawnMarble();
      return true;
    }
    if (x >= this.canvas.width - 120 && x <= this.canvas.width - 20) {
      this.clearBoard();
      return true;
    }
    return false;
  }

  private handleSelectedPartMenu(x: number, y: number): boolean {
    if (!this.selectedPart) return false;
    const menuPos = this.getPartMenuPosition(this.selectedPart);
    if (Math.hypot(x - menuPos.x, y - menuPos.y) < 20) {
      this.rotatePart(this.selectedPart);
      return true;
    }
    if (Math.hypot(x - (menuPos.x + 45), y - menuPos.y) < 20) {
      this.deletePart(this.selectedPart);
      return true;
    }
    return false;
  }

  private pickOrDeselectPart(x: number, y: number): void {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const part = this.parts[i];
      const dist = Math.hypot(x - part.body.position.x, y - part.body.position.y);
      const hitRadius = part.type === 'bumper' ? part.radius! : 35;

      if (dist < hitRadius) {
        this.selectedPart = part;
        this.draggingPart = part;
        this.dragOffset = { x: x - part.body.position.x, y: y - part.body.position.y };
        this.haptics.lightTap();
        return;
      }
    }
    this.selectedPart = null;
  }

  private movePress(x: number, y: number) {
    if (this.draggingPart && this.canvas) {
      const pos = {
        x: Math.max(40, Math.min(x - this.dragOffset.x, this.canvas.width - 40)),
        y: Math.max(this.startingFunnel.y + 40, Math.min(y - this.dragOffset.y, this.canvas.height - this.toolboxHeight - 40))
      };
      Body.setPosition(this.draggingPart.body, pos);
    }
  }

  private endPress() {
    this.draggingPart = null;
  }

  private rotatePart(part: SandboxPart) {
    const nextAngle = part.body.angle + Math.PI / 4;
    Body.setAngle(part.body, nextAngle);
    part.angle = nextAngle;
    this.audio.play('clink');
    this.haptics.lightTap();
  }

  private deletePart(part: SandboxPart) {
    if (!this.world) return;
    World.remove(this.world, part.body);
    this.parts = this.parts.filter(p => p.id !== part.id);
    if (this.selectedPart?.id === part.id) {
      this.selectedPart = null;
    }
    this.audio.play('pop');
    this.haptics.lightTap();
  }

  private clearBoard() {
    if (!this.world) return;
    this.parts.forEach(p => World.remove(this.world!, p.body));
    this.marbles.forEach(m => World.remove(this.world!, m));
    this.parts = [];
    this.marbles = [];
    this.selectedPart = null;
    this.gameWon = false;
    this.audio.play('pop');
    this.haptics.lightTap();
  }

  private getPartMenuPosition(part: SandboxPart): { x: number; y: number } {
    const px = part.body.position.x - 22;
    const py = part.body.position.y - (part.type === 'bumper' ? part.radius! + 32 : 36);
    return { x: px, y: py };
  }

  private createSparks(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2 + Math.random() * 3,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5
      });
    }
  }

  private createConfetti(x: number, y: number, count: number) {
    const colors = ['#FF5E5E', '#FFE66D', '#4ECDC4', '#A78BFA', '#F472B6'];
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 1.1 + Math.random() * Math.PI * 0.8;
      const speed = 100 + Math.random() * 200;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: 4 + Math.random() * 5,
        life: 1.5 + Math.random() * 1.0,
        maxLife: 2.5
      });
    }
  }

  update(dt: number): void {
    if (!this.engine || !this.world || this.paused) return;

    const dtSec = dt / 1000;

    Engine.update(this.engine, Math.min(30, dt));

    this.parts.forEach(part => {
      if (part.type === 'booster') {
        this.marbles.forEach(marble => {
          const dist = Math.hypot((marble.position.x - part.body.position.x), (marble.position.y - part.body.position.y));
          if (dist < 45) {
            const forceDirection = part.body.angle;
            const forceStrength = 0.008;
            Body.applyForce(marble, marble.position, {
              x: forceStrength * Math.cos(forceDirection),
              y: forceStrength * Math.sin(forceDirection)
            });
            this.createSparks(marble.position.x, marble.position.y, '#2E9E6B', 1);
          }
        });
      }

      if (part.scaleAnimation && part.scaleAnimation > 1.0) {
        part.scaleAnimation -= dtSec * 2.0;
        if (part.scaleAnimation < 1.0) part.scaleAnimation = 1.0;
      }
    });

    if (this.canvas) {
      for (let i = this.marbles.length - 1; i >= 0; i--) {
        const m = this.marbles[i];
        if (m.position.y > this.canvas.height || m.position.y < -50) {
          World.remove(this.world, m);
          this.marbles.splice(i, 1);
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.vy += 200 * dtSec;
      p.life -= dtSec;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.gameWon) {
      this.winAnimationTimer += dtSec;
      if (this.winAnimationTimer > 0.4 && this.particles.length < 20) {
        this.createConfetti(this.canvas!.width / 2, this.canvas!.height / 2, 10);
        this.winAnimationTimer = 0;
      }
    }

    this.render();
  }

  private render() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#F4ECD8';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawFunnel();
    this.drawGoalCup();

    this.parts.forEach(part => {
      this.ctx!.save();
      this.ctx!.translate(part.body.position.x, part.body.position.y);
      this.ctx!.rotate(part.body.angle);

      const isSelected = this.selectedPart?.id === part.id;

      if (isSelected) {
        this.ctx!.shadowColor = '#C0392B';
        this.ctx!.shadowBlur = 12;
      }

      if (part.type === 'ramp') {
        const w = part.width!;
        const h = part.height!;

        this.ctx!.fillStyle = '#A0522D';
        this.ctx!.strokeStyle = '#2B2D5E';
        this.ctx!.lineWidth = 3;
        this.ctx!.beginPath();
        this.ctx!.roundRect(-w / 2, -h / 2, w, h, 6);
        this.ctx!.fill();
        this.ctx!.stroke();

        this.ctx!.strokeStyle = 'rgba(43, 45, 94, 0.2)';
        this.ctx!.lineWidth = 2;
        this.ctx!.beginPath();
        this.ctx!.moveTo(-w / 3, -h / 4);
        this.ctx!.lineTo(w / 3, -h / 4);
        this.ctx!.moveTo(-w / 2.5, h / 4);
        this.ctx!.lineTo(w / 4, h / 4);
        this.ctx!.stroke();
        
      } else if (part.type === 'bumper') {
        const scale = part.scaleAnimation || 1.0;
        const r = part.radius! * scale;

        this.ctx!.fillStyle = part.scaleAnimation && part.scaleAnimation > 1.1 ? '#FFE66D' : '#C0392B';
        this.ctx!.strokeStyle = '#2B2D5E';
        this.ctx!.lineWidth = 3.5;
        this.ctx!.beginPath();
        this.ctx!.arc(0, 0, r, 0, Math.PI * 2);
        this.ctx!.fill();
        this.ctx!.stroke();

        this.ctx!.fillStyle = '#ffffff';
        this.ctx!.beginPath();
        this.ctx!.arc(0, 0, r * 0.45, 0, Math.PI * 2);
        this.ctx!.fill();
        this.ctx!.stroke();
        
      } else {
        const w = part.width!;
        const h = part.height!;

        this.ctx!.fillStyle = '#2E9E6B';
        this.ctx!.strokeStyle = '#2B2D5E';
        this.ctx!.lineWidth = 2.5;
        this.ctx!.beginPath();
        this.ctx!.roundRect(-w / 2, -h / 2, w, h, 4);
        this.ctx!.fill();
        this.ctx!.stroke();

        this.ctx!.fillStyle = '#ffffff';
        this.ctx!.beginPath();
        this.ctx!.moveTo(-20, -4);
        this.ctx!.lineTo(-10, 0);
        this.ctx!.lineTo(-20, 4);
        this.ctx!.moveTo(0, -4);
        this.ctx!.lineTo(10, 0);
        this.ctx!.lineTo(0, 4);
        this.ctx!.moveTo(20, -4);
        this.ctx!.lineTo(30, 0);
        this.ctx!.lineTo(20, 4);
        this.ctx!.fill();
      }

      this.ctx!.restore();
    });

    if (this.selectedPart) {
      this.drawSelectedPartMenu(this.selectedPart);
    }

    this.marbles.forEach(m => {
      this.ctx!.save();
      this.ctx!.translate(m.position.x, m.position.y);

      this.ctx!.shadowColor = 'rgba(43, 45, 94, 0.25)';
      this.ctx!.shadowBlur = 8;
      this.ctx!.shadowOffsetY = 4;

      const grad = this.ctx!.createRadialGradient(-3, -3, 2, 0, 0, 11);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#85C1E9');
      grad.addColorStop(1, '#2E86C1');

      this.ctx!.fillStyle = grad;
      this.ctx!.strokeStyle = '#2B2D5E';
      this.ctx!.lineWidth = 2.5;
      this.ctx!.beginPath();
      this.ctx!.arc(0, 0, 11, 0, Math.PI * 2);
      this.ctx!.fill();
      this.ctx!.stroke();

      this.ctx!.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx!.lineWidth = 1.5;
      this.ctx!.beginPath();
      this.ctx!.arc(-2, 2, 5, 0.5, Math.PI - 0.5);
      this.ctx!.stroke();

      this.ctx!.restore();
    });

    this.particles.forEach(p => {
      this.ctx!.fillStyle = p.color;
      this.ctx!.globalAlpha = Math.max(0, p.life / p.maxLife);
      this.ctx!.beginPath();
      this.ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx!.fill();
    });
    this.ctx.globalAlpha = 1.0;

    this.drawActionUI();
    this.drawToolboxPanel();

    if (this.gameWon) {
      this.drawWinOverlay();
    }
  }

  private drawFunnel() {
    if (!this.ctx) return;
    const f = this.startingFunnel;

    this.ctx.fillStyle = '#D4B896';
    this.ctx.strokeStyle = '#2B2D5E';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.roundRect(f.x - 10, f.y + f.height - 25, 20, 30, 4);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#E59866';
    this.ctx.beginPath();
    this.ctx.moveTo(f.x - f.width / 2, f.y);
    this.ctx.lineTo(f.x + f.width / 2, f.y);
    this.ctx.lineTo(f.x + 12, f.y + f.height - 15);
    this.ctx.lineTo(f.x - 12, f.y + f.height - 15);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#2B2D5E';
    this.ctx.beginPath();
    this.ctx.roundRect(f.x - f.width / 2 - 4, f.y - 6, f.width + 8, 10, 4);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 11px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('START', f.x, f.y - 1);
  }

  private drawGoalCup() {
    if (!this.ctx || !this.goalCupBody) return;
    const pos = this.goalCupBody.position;
    const w = 90;
    const h = 50;

    this.ctx.fillStyle = '#E59866';
    this.ctx.strokeStyle = '#2B2D5E';
    this.ctx.lineWidth = 3.5;
    this.ctx.beginPath();
    this.ctx.roundRect(pos.x - w / 2, pos.y - h / 2, w, h, 8);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(43, 45, 94, 0.15)';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    for (let o = -w / 2 + 15; o < w / 2; o += 15) {
      this.ctx.moveTo(pos.x + o, pos.y - h / 2);
      this.ctx.lineTo(pos.x + o, pos.y + h / 2);
    }
    this.ctx.moveTo(pos.x - w / 2, pos.y);
    this.ctx.lineTo(pos.x + w / 2, pos.y);
    this.ctx.stroke();

    this.ctx.fillStyle = '#D4B896';
    this.ctx.strokeStyle = '#2B2D5E';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.roundRect(pos.x - w / 2 - 4, pos.y - h / 2 - 4, w + 8, 10, 4);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#2B2D5E';
    this.ctx.font = 'bold 12px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('GOAL', pos.x, pos.y);
  }

  private drawSelectedPartMenu(part: SandboxPart) {
    if (!this.ctx) return;
    const pos = this.getPartMenuPosition(part);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = '#2B2D5E';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(pos.x - 12, pos.y - 20, 68, 40, 8);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#2E9E6B';
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 15px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('↻', pos.x, pos.y);

    this.ctx.fillStyle = '#C0392B';
    this.ctx.beginPath();
    this.ctx.arc(pos.x + 45, pos.y, 14, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 15px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('✕', pos.x + 45, pos.y);
  }

  private drawActionUI() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.fillStyle = '#FF5E5E';
    this.ctx.strokeStyle = '#2B2D5E';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.roundRect(20, 20, 130, 40, 12);
    this.ctx.fill();
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 15px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('🔴 Drop Marble', 85, 40);

    this.ctx.fillStyle = '#F4ECD8';
    this.ctx.strokeStyle = '#2B2D5E';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.roundRect(this.canvas.width - 120, 20, 100, 40, 12);
    this.ctx.fill();
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#2B2D5E';
    this.ctx.font = 'bold 15px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Clear Board', this.canvas.width - 70, 40);
  }

  private drawToolboxPanel() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.strokeStyle = '#2B2D5E';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height - this.toolboxHeight);
    this.ctx.lineTo(this.canvas.width, this.canvas.height - this.toolboxHeight);
    this.ctx.stroke();

    this.ctx.fillStyle = '#D4B896';
    this.ctx.fillRect(0, this.canvas.height - this.toolboxHeight + 2, this.canvas.width, this.toolboxHeight);

    this.toolboxButtons.forEach(btn => {
      this.ctx!.fillStyle = 'rgba(43, 45, 94, 0.15)';
      this.ctx!.beginPath();
      this.ctx!.roundRect(btn.x + 3, btn.y + 3, btn.width, btn.height, 12);
      this.ctx!.fill();

      this.ctx!.fillStyle = btn.color;
      this.ctx!.strokeStyle = '#2B2D5E';
      this.ctx!.lineWidth = 3;
      this.ctx!.beginPath();
      this.ctx!.roundRect(btn.x, btn.y, btn.width, btn.height, 12);
      this.ctx!.fill();
      this.ctx!.stroke();

      this.ctx!.fillStyle = '#ffffff';
      this.ctx!.font = 'bold 15px Fredoka, sans-serif';
      this.ctx!.textAlign = 'center';
      this.ctx!.textBaseline = 'middle';
      this.ctx!.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2);
    });
  }

  private drawWinOverlay() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(43, 45, 94, 0.4)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const cardW = 280;
    const cardH = 140;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2 - 30;

    this.ctx.fillStyle = '#F4ECD8';
    this.ctx.strokeStyle = '#2B2D5E';
    this.ctx.lineWidth = 4;
    this.ctx.shadowColor = 'rgba(43, 45, 94, 0.3)';
    this.ctx.shadowBlur = 20;
    
    this.ctx.beginPath();
    this.ctx.roundRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 20);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();

    this.ctx.fillStyle = '#C0392B';
    this.ctx.font = 'bold 24px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('Success! 🌟', cx, cy - cardH / 2 + 24);

    this.ctx.fillStyle = '#2B2D5E';
    this.ctx.font = '500 16px Fredoka, sans-serif';
    this.ctx.fillText('You built a great run!', cx, cy + 12);
    this.ctx.font = 'bold 13px Fredoka, sans-serif';
    this.ctx.fillStyle = '#A0522D';
    this.ctx.fillText('Tapping board resets', cx, cy + 38);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  destroy(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('touchstart', this.handleTouchStart);
      this.canvas.removeEventListener('touchmove', this.handleTouchMove);
      this.canvas.removeEventListener('touchend', this.handleTouchEnd);
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    }
    
    if (this.engine) {
      World.clear(this.engine.world, false);
      Engine.clear(this.engine);
    }
    this.parts = [];
    this.marbles = [];
    this.particles = [];
  }
}
