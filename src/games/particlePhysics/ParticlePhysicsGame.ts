import { BaseGame } from '../../core/BaseGame';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

const PALETTE = [
  '#FF5E5E', '#FF85B3', '#FB923C', '#FFE66D',
  '#34D399', '#4ECDC4', '#6BCBFF', '#A78BFA',
  '#F472B6', '#FBBF24', '#60A5FA', '#C084FC',
];

export class ParticlePhysicsGame extends BaseGame {
  private particles: Particle[] = [];
  private paused = false;
  private pointers: Map<number, { x: number; y: number }> = new Map();
  private spawnAccum = 0;
  private gravity = 120;
  private particleDuration = 3;
  private particleDensity = 4;
  private currentHue = 0;
  private lastHapticTime = 0;
  private readonly hapticInterval = 80;



  protected onInit(): void {
    this.particles = [];
    this.pointers = new Map();
    this.paused = false;
    this.spawnAccum = 0;
    this.currentHue = 0;

    // Randomize settings each session
    this.gravity = 80 + Math.random() * 100;
    this.particleDuration = 2 + Math.random() * 3;
    this.particleDensity = 3 + Math.floor(Math.random() * 5);

    this.canvas?.addEventListener('mousedown', this.onMouseDown);
    this.canvas?.addEventListener('mousemove', this.onMouseMove);
    this.canvas?.addEventListener('mouseup', this.onMouseUp);
    this.canvas?.addEventListener('touchstart', this.onTouchStart);
    this.canvas?.addEventListener('touchmove', this.onTouchMove);
    this.canvas?.addEventListener('touchend', this.onTouchEnd);
    this.canvas?.addEventListener('touchcancel', this.onTouchEnd);
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  private readonly onMouseDown = (e: MouseEvent) => {
    this.pointers.set(-1, this.getCanvasPos(e.clientX, e.clientY));
    this.haptics.lightTap();
    this.lastHapticTime = performance.now();
  };

  private triggerDragHaptic() {
    const now = performance.now();
    if (now - this.lastHapticTime >= this.hapticInterval) {
      this.haptics.lightTap();
      this.lastHapticTime = now;
    }
  }

  private readonly onMouseMove = (e: MouseEvent) => {
    if (this.pointers.has(-1)) {
      this.pointers.set(-1, this.getCanvasPos(e.clientX, e.clientY));
      this.triggerDragHaptic();
    }
  };

  private readonly onMouseUp = () => {
    this.pointers.delete(-1);
  };

  private readonly onTouchStart = (e: TouchEvent) => {
    for (const touch of Array.from(e.changedTouches)) {
      this.pointers.set(touch.identifier, this.getCanvasPos(touch.clientX, touch.clientY));
    }
    this.haptics.lightTap();
    this.lastHapticTime = performance.now();
  };

  private readonly onTouchMove = (e: TouchEvent) => {
    let moved = false;
    for (const touch of Array.from(e.changedTouches)) {
      if (this.pointers.has(touch.identifier)) {
        this.pointers.set(touch.identifier, this.getCanvasPos(touch.clientX, touch.clientY));
        moved = true;
      }
    }
    if (moved) {
      this.triggerDragHaptic();
    }
  };

  private readonly onTouchEnd = (e: TouchEvent) => {
    for (const touch of Array.from(e.changedTouches)) {
      this.pointers.delete(touch.identifier);
    }
  };

  private spawnParticle(x: number, y: number) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 80 + 20;
    const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const radius = 3 + Math.random() * 6;

    this.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: this.particleDuration,
      maxLife: this.particleDuration,
      radius,
      color,
    });
  }

  update(dt: number): void {
    if (!this.canvas || !this.ctx || this.paused) return;

    const dtSec = dt / 1000;

    // Spawn particles from active pointers
    this.spawnNewParticles(dt);

    // Update particles
    this.updateParticles(dtSec);

    // Cap particle count
    if (this.particles.length > 2000) {
      this.particles.splice(0, this.particles.length - 2000);
    }

    this.render();
  }

  private spawnNewParticles(dt: number) {
    if (this.pointers.size === 0) return;

    this.spawnAccum += dt;
    const spawnInterval = 1000 / (this.particleDensity * 20);
    while (this.spawnAccum >= spawnInterval) {
      this.spawnAccum -= spawnInterval;
      for (const pos of this.pointers.values()) {
        this.spawnParticle(pos.x, pos.y);
      }
    }
    this.currentHue = (this.currentHue + dt * 0.1) % 360;
  }

  private updateParticles(dtSec: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += this.gravity * dtSec;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.life -= dtSec;

      this.handleBoundaryCollisions(p);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private handleBoundaryCollisions(p: Particle) {
    if (!this.canvas) return;

    // Bounce off walls
    if (this.canvas.width > 0) {
      if (p.x < p.radius) {
        p.x = p.radius;
        p.vx = Math.abs(p.vx) * 0.6;
      } else if (p.x > this.canvas.width - p.radius) {
        p.x = this.canvas.width - p.radius;
        p.vx = -Math.abs(p.vx) * 0.6;
      }
    }

    // Bounce off floor
    if (p.y > this.canvas.height - p.radius) {
      p.y = this.canvas.height - p.radius;
      p.vy = -Math.abs(p.vy) * 0.5;
      p.vx *= 0.8;
    }
  }

  private render() {
    if (!this.ctx || !this.canvas) return;

    // Semi-transparent clear for trail effect
    this.ctx.fillStyle = 'rgba(26, 26, 46, 0.3)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius * (0.5 + alpha * 0.5), 0, Math.PI * 2);
      this.ctx.fill();

      // Inner glow
      this.ctx.globalAlpha = alpha * 0.4;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius * 0.3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1.0;

    // Draw touch indicator
    for (const pos of this.pointers.values()) {
      this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  destroy(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.onMouseDown);
      this.canvas.removeEventListener('mousemove', this.onMouseMove);
      this.canvas.removeEventListener('mouseup', this.onMouseUp);
      this.canvas.removeEventListener('touchstart', this.onTouchStart);
      this.canvas.removeEventListener('touchmove', this.onTouchMove);
      this.canvas.removeEventListener('touchend', this.onTouchEnd);
      this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
    }
    this.particles = [];
    this.pointers.clear();
  }
}
