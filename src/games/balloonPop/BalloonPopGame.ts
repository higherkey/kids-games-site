import { BaseGame } from '../../core/BaseGame';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Balloon {
  x: number;
  y: number;
  radius: number;
  color: string;
  pattern: 'dots' | 'stripes' | 'none';
  hits: number;
  maxHits: number;
  velocity: number;
}

export class BalloonPopGame extends BaseGame {
  private balloons: Balloon[] = [];
  private particles: Particle[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 1500;
  private popsCount: number = 0;

  constructor() {
    super();
    this.audio.registerSound('pop', '/sounds/pop.ogg');
  }

  protected onInit(): void {
    this.balloons = [];
    this.particles = [];
    this.spawnInterval = 1500;
    this.popsCount = 0;

    this.canvas?.addEventListener('mousedown', this.handleInput);
    this.canvas?.addEventListener('touchstart', this.handleTouch);
  }

  private readonly handleTouch = (e: TouchEvent) => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    Array.from(e.changedTouches).forEach(touch => {
      this.checkPop(touch.clientX - rect.left, touch.clientY - rect.top);
    });
  }

  private readonly handleInput = (e: MouseEvent) => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.checkPop(e.clientX - rect.left, e.clientY - rect.top);
  }

  private checkPop(x: number, y: number) {
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      const dist = Math.hypot((x - b.x), (y - b.y));
      if (dist < b.radius) {
        b.hits++;
        if (b.hits >= b.maxHits) {
          this.popBalloon(i);
        } else {
          this.audio.play('pop');
          this.haptics.lightTap();
          this.createParticles(b.x, b.y, b.color, 4);
        }
        break;
      }
    }
  }

  private popBalloon(index: number) {
    const b = this.balloons[index];
    this.createParticles(b.x, b.y, b.color, 12);
    this.balloons.splice(index, 1);
    this.audio.play('pop');
    this.haptics.heavyImpact();
    this.popsCount++;
    
    // Difficulty scaling
    if (this.popsCount % 5 === 0) {
      this.spawnInterval = Math.max(400, this.spawnInterval * 0.9);
    }
  }

  private createParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color
      });
    }
  }

  update(dt: number): void {
    if (!this.canvas || !this.ctx) return;

    // Spawn balloons
    this.spawnTimer += dt;
    if (this.spawnTimer > this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnBalloon();
    }

    // Update balloons
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      b.y -= b.velocity * (dt / 16);
      if (b.y < -b.radius * 2) {
        this.balloons.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.render();
  }

  private spawnBalloon() {
    const types = [
      { color: '#FF5E5E', maxHits: 1, pattern: 'none' as const },
      { color: '#6BCBFF', maxHits: 2, pattern: 'stripes' as const },
      { color: '#FFE66D', maxHits: 3, pattern: 'dots' as const }
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    
    this.balloons.push({
      x: Math.random() * (this.canvas!.width - 100) + 50,
      y: this.canvas!.height + 100,
      radius: 40 + Math.random() * 20,
      color: type.color,
      pattern: type.pattern,
      hits: 0,
      maxHits: type.maxHits,
      velocity: 2 + Math.random() * 2
    });
  }

  private render() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw balloons
    this.balloons.forEach(b => {
      this.ctx!.save();
      this.ctx!.beginPath();
      this.ctx!.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      this.ctx!.fillStyle = b.color;
      this.ctx!.fill();
      
      // Draw patterns for a11y
      if (b.pattern === 'stripes') {
        this.ctx!.strokeStyle = 'rgba(255,255,255,0.4)';
        this.ctx!.lineWidth = 5;
        this.ctx!.clip();
        for (let i = -b.radius; i < b.radius * 2; i += 15) {
          this.ctx!.beginPath();
          this.ctx!.moveTo(b.x - b.radius, b.y + i);
          this.ctx!.lineTo(b.x + b.radius, b.y + i - 20);
          this.ctx!.stroke();
        }
      } else if (b.pattern === 'dots') {
        this.ctx!.fillStyle = 'rgba(255,255,255,0.4)';
        this.ctx!.clip();
        for (let i = 0; i < 20; i++) {
          const dx = (Math.random() - 0.5) * b.radius * 2;
          const dy = (Math.random() - 0.5) * b.radius * 2;
          this.ctx!.beginPath();
          this.ctx!.arc(b.x + dx, b.y + dy, 5, 0, Math.PI * 2);
          this.ctx!.fill();
        }
      }

      this.ctx!.restore();
      this.ctx!.strokeStyle = 'rgba(0,0,0,0.2)';
      this.ctx!.lineWidth = 2;
      this.ctx!.stroke();
    });

    // Draw particles
    this.particles.forEach(p => {
      this.ctx!.globalAlpha = p.life;
      this.ctx!.fillStyle = p.color;
      this.ctx!.beginPath();
      this.ctx!.arc(p.x, p.y, 4, 0, Math.PI * 2);
      this.ctx!.fill();
    });
    this.ctx!.globalAlpha = 1.0;
  }



  destroy(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.handleInput);
      this.canvas.removeEventListener('touchstart', this.handleTouch);
    }
  }
}
