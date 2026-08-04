import type { Game } from '../../core/Game';
import { AudioController } from '../../core/AudioController';
import { HapticController } from '../../core/HapticController';

export type AnimalType = 'Whale' | 'Elephant' | 'Duck' | 'Lion' | 'Bird';

interface Cloud {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  blobs: { offsetX: number; offsetY: number; radiusRatio: number }[];
  morphed: boolean;
  morphProgress: number; // 0 to 1
  animalType: AnimalType;
  opacity: number;
  scale: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1 to 0
  maxLife: number;
  size: number;
  color: string;
  isStar: boolean;
}

export class CloudShapeGame implements Game {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private readonly audio: AudioController;
  private readonly haptics: HapticController;
  private paused: boolean = false;

  private clouds: Cloud[] = [];
  private particles: Particle[] = [];
  private skyMode: 'day' | 'sunset' = 'day';
  private skyToggleBtn = { x: 20, y: 16, width: 115, height: 44 };

  private isDragging: boolean = false;
  private animalCycleIndex: number = 0;
  private readonly animalTypes: AnimalType[] = ['Whale', 'Elephant', 'Duck', 'Lion', 'Bird'];

  constructor() {
    this.audio = AudioController.getInstance();
    this.haptics = HapticController.getInstance();
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.clouds = [];
    this.particles = [];
    this.animalCycleIndex = 0;

    this.spawnInitialClouds();

    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mouseup', this.handleMouseUp);
    canvas.addEventListener('mouseleave', this.handleMouseUp);

    canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.handleTouchEnd);
    canvas.addEventListener('touchcancel', this.handleTouchEnd);
  }

  private spawnInitialClouds(): void {
    if (!this.canvas) return;
    const count = 4;
    const width = this.canvas.width || 800;
    const height = this.canvas.height || 600;

    for (let i = 0; i < count; i++) {
      this.clouds.push(this.createCloud(
        Math.random() * (width - 200) + 100,
        Math.random() * (height * 0.5) + 80
      ));
    }
  }

  private createCloud(x: number, y: number): Cloud {
    const animalType = this.animalTypes[this.animalCycleIndex % this.animalTypes.length];
    this.animalCycleIndex++;

    const blobsCount = 5 + Math.floor(Math.random() * 3);
    const blobs = [];
    for (let b = 0; b < blobsCount; b++) {
      blobs.push({
        offsetX: (Math.random() - 0.5) * 70,
        offsetY: (Math.random() - 0.5) * 35,
        radiusRatio: 0.5 + Math.random() * 0.5,
      });
    }

    return {
      x,
      y,
      vx: (Math.random() * 0.3 + 0.1) * (Math.random() < 0.5 ? 1 : -1),
      vy: Math.sin(Math.random() * Math.PI * 2) * 0.05,
      baseRadius: 45 + Math.random() * 15,
      blobs,
      morphed: false,
      morphProgress: 0,
      animalType,
      opacity: 0.85 + Math.random() * 0.15,
      scale: 1,
    };
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  private handleMouseDown = (e: MouseEvent) => {
    if (this.paused) return;
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.isDragging = true;
    this.interactAt(pos.x, pos.y);
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.paused || !this.isDragging) return;
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.interactAt(pos.x, pos.y);
  };

  private handleMouseUp = () => {
    this.isDragging = false;
  };

  private handleTouchStart = (e: TouchEvent) => {
    if (this.paused) return;
    e.preventDefault();
    this.isDragging = true;
    Array.from(e.changedTouches).forEach(touch => {
      const pos = this.getCanvasPos(touch.clientX, touch.clientY);
      this.interactAt(pos.x, pos.y);
    });
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (this.paused || !this.isDragging) return;
    e.preventDefault();
    Array.from(e.changedTouches).forEach(touch => {
      const pos = this.getCanvasPos(touch.clientX, touch.clientY);
      this.interactAt(pos.x, pos.y);
    });
  };

  private handleTouchEnd = () => {
    this.isDragging = false;
  };

  private interactAt(x: number, y: number): void {
    // Check sky toggle button
    if (
      x >= this.skyToggleBtn.x &&
      x <= this.skyToggleBtn.x + this.skyToggleBtn.width &&
      y >= this.skyToggleBtn.y &&
      y <= this.skyToggleBtn.y + this.skyToggleBtn.height
    ) {
      this.skyMode = this.skyMode === 'day' ? 'sunset' : 'day';
      this.haptics.lightTap();
      this.audio.play('synth:click', 'C5');
      return;
    }

    // Check cloud tap/drag
    for (const cloud of this.clouds) {
      const dist = Math.hypot(x - cloud.x, y - cloud.y);
      if (dist < cloud.baseRadius * 2.2 && !cloud.morphed) {
        cloud.morphed = true;
        this.audio.play('synth:chime', 'G4');
        this.haptics.lightTap();
        this.spawnStarParticles(cloud.x, cloud.y, 16);
        break;
      }
    }
  }

  private spawnStarParticles(cx: number, cy: number, count: number): void {
    const colors = ['#FFE66D', '#FFD166', '#FFFFFF', '#6BCBFF', '#FF85B3'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        life: 1.0,
        maxLife: 1.0,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        isStar: Math.random() > 0.3,
      });
    }
  }

  public toggleSky(): void {
    this.skyMode = this.skyMode === 'day' ? 'sunset' : 'day';
  }

  public getSkyMode(): 'day' | 'sunset' {
    return this.skyMode;
  }

  public getClouds(): Cloud[] {
    return this.clouds;
  }

  update(dt: number): void {
    if (!this.canvas || !this.ctx || this.paused) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Update clouds position and morphing
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cloud = this.clouds[i];
      cloud.x += cloud.vx * (dt / 16);
      cloud.y += cloud.vy * (dt / 16);

      // Bounce off walls gently
      if (cloud.x < 80 || cloud.x > width - 80) {
        cloud.vx *= -1;
      }
      if (cloud.y < 50 || cloud.y > height * 0.6) {
        cloud.vy *= -1;
      }

      if (cloud.morphed && cloud.morphProgress < 1) {
        cloud.morphProgress = Math.min(1, cloud.morphProgress + dt * 0.003);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03; // Light gravity
      p.life -= dt * 0.0015;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.render();
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Draw background
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, h);
    if (this.skyMode === 'day') {
      bgGrad.addColorStop(0, '#70C1FF');
      bgGrad.addColorStop(0.6, '#BCE3FF');
      bgGrad.addColorStop(1, '#EBF7FF');
    } else {
      bgGrad.addColorStop(0, '#2D1B4E');
      bgGrad.addColorStop(0.4, '#7C3AED');
      bgGrad.addColorStop(0.7, '#FF6B6B');
      bgGrad.addColorStop(1, '#FFC107');
    }
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, w, h);

    // Draw sun/moon
    this.ctx.save();
    if (this.skyMode === 'day') {
      this.ctx.fillStyle = '#FFE66D';
      this.ctx.shadowColor = '#FFE66D';
      this.ctx.shadowBlur = 30;
      this.ctx.beginPath();
      this.ctx.arc(w - 70, 70, 35, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.fillStyle = '#FFF9E6';
      this.ctx.shadowColor = '#FFF9E6';
      this.ctx.shadowBlur = 25;
      this.ctx.beginPath();
      this.ctx.arc(w - 70, 70, 30, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();

    // Draw sky toggle button
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 2;
    this.roundRect(this.skyToggleBtn.x, this.skyToggleBtn.y, this.skyToggleBtn.width, this.skyToggleBtn.height, 18);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#1E293B';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    const toggleText = this.skyMode === 'day' ? '☀️ Day' : '🌅 Sunset';
    this.ctx.fillText(toggleText, this.skyToggleBtn.x + this.skyToggleBtn.width / 2, this.skyToggleBtn.y + this.skyToggleBtn.height / 2);
    this.ctx.restore();

    // Draw clouds
    for (const cloud of this.clouds) {
      this.drawCloud(cloud);
    }

    // Draw particles
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillStyle = p.color;
      if (p.isStar) {
        this.drawStar(p.x, p.y, 5, p.size, p.size / 2);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }
  }

  private drawCloud(cloud: Cloud): void {
    if (!this.ctx) return;
    this.ctx.save();
    this.ctx.translate(cloud.x, cloud.y);

    const p = cloud.morphProgress;

    // Draw fluffy cloud blobs fading out if morphing
    if (p < 1) {
      this.ctx.globalAlpha = cloud.opacity * (1 - p);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      this.ctx.shadowBlur = 15;

      this.ctx.beginPath();
      this.ctx.arc(0, 0, cloud.baseRadius, 0, Math.PI * 2);
      for (const b of cloud.blobs) {
        this.ctx.arc(b.offsetX, b.offsetY, cloud.baseRadius * b.radiusRatio, 0, Math.PI * 2);
      }
      this.ctx.fill();

      // Soft highlight
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.beginPath();
      this.ctx.arc(0, -cloud.baseRadius * 0.3, cloud.baseRadius * 0.7, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw animal SVG shape outline when morphing/morphed
    if (p > 0) {
      this.ctx.globalAlpha = p;
      this.ctx.strokeStyle = this.skyMode === 'day' ? '#1E3A8A' : '#FFFFFF';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      this.ctx.lineWidth = 4;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      this.ctx.save();
      const scale = 0.8 + p * 0.2;
      this.ctx.scale(scale, scale);

      this.drawAnimalOutline(cloud.animalType);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  private drawAnimalOutline(type: AnimalType): void {
    if (!this.ctx) return;
    this.ctx.beginPath();

    switch (type) {
      case 'Whale':
        // Cute whale shape
        this.ctx.ellipse(0, 5, 55, 35, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Tail
        this.ctx.beginPath();
        this.ctx.moveTo(45, 5);
        this.ctx.quadraticCurveTo(70, -15, 75, -25);
        this.ctx.quadraticCurveTo(60, 5, 75, 20);
        this.ctx.quadraticCurveTo(65, 10, 45, 5);
        this.ctx.fill();
        this.ctx.stroke();

        // Eye & Spout
        this.ctx.fillStyle = '#1E293B';
        this.ctx.beginPath();
        this.ctx.arc(-25, -5, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Water blow spout
        this.ctx.strokeStyle = '#38BDF8';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(-10, -30);
        this.ctx.quadraticCurveTo(-15, -45, -25, -50);
        this.ctx.moveTo(-10, -30);
        this.ctx.quadraticCurveTo(-5, -48, 5, -52);
        this.ctx.stroke();
        break;

      case 'Elephant':
        // Body & Head
        this.ctx.ellipse(0, 10, 45, 35, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Ear
        this.ctx.beginPath();
        this.ctx.ellipse(15, -5, 20, 25, 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Trunk
        this.ctx.beginPath();
        this.ctx.moveTo(-35, 5);
        this.ctx.bezierCurveTo(-55, 10, -50, -25, -35, -20);
        this.ctx.lineWidth = 7;
        this.ctx.stroke();
        this.ctx.lineWidth = 4;

        // Eye
        this.ctx.fillStyle = '#1E293B';
        this.ctx.beginPath();
        this.ctx.arc(-20, -8, 4, 0, Math.PI * 2);
        this.ctx.fill();
        break;

      case 'Duck':
        // Body
        this.ctx.ellipse(5, 15, 40, 25, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Head
        this.ctx.beginPath();
        this.ctx.arc(-20, -15, 22, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Beak
        this.ctx.fillStyle = '#FB923C';
        this.ctx.beginPath();
        this.ctx.moveTo(-38, -18);
        this.ctx.quadraticCurveTo(-50, -12, -38, -6);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Eye
        this.ctx.fillStyle = '#1E293B';
        this.ctx.beginPath();
        this.ctx.arc(-25, -20, 3.5, 0, Math.PI * 2);
        this.ctx.fill();
        break;

      case 'Lion':
        // Mane
        this.ctx.fillStyle = '#F59E0B';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 48, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Face
        this.ctx.fillStyle = '#FEF08A';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 32, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Eyes & Nose
        this.ctx.fillStyle = '#1E293B';
        this.ctx.beginPath();
        this.ctx.arc(-12, -8, 4, 0, Math.PI * 2);
        this.ctx.arc(12, -8, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Nose
        this.ctx.beginPath();
        this.ctx.moveTo(-6, 4);
        this.ctx.lineTo(6, 4);
        this.ctx.lineTo(0, 12);
        this.ctx.closePath();
        this.ctx.fill();
        break;

      case 'Bird':
        // Body
        this.ctx.ellipse(0, 5, 38, 24, -0.2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Wing
        this.ctx.beginPath();
        this.ctx.ellipse(-5, 5, 20, 12, -0.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Head
        this.ctx.beginPath();
        this.ctx.arc(25, -12, 18, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Beak
        this.ctx.fillStyle = '#F97316';
        this.ctx.beginPath();
        this.ctx.moveTo(38, -16);
        this.ctx.lineTo(50, -10);
        this.ctx.lineTo(38, -6);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Eye
        this.ctx.fillStyle = '#1E293B';
        this.ctx.beginPath();
        this.ctx.arc(28, -16, 3.5, 0, Math.PI * 2);
        this.ctx.fill();
        break;
    }
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    if (!this.ctx) return;
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      this.ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.ctx.lineTo(x, y);
      rot += step;
    }
    this.ctx.lineTo(cx, cy - outerRadius);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
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
      this.canvas.removeEventListener('mouseleave', this.handleMouseUp);

      this.canvas.removeEventListener('touchstart', this.handleTouchStart);
      this.canvas.removeEventListener('touchmove', this.handleTouchMove);
      this.canvas.removeEventListener('touchend', this.handleTouchEnd);
      this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
    }
    this.clouds = [];
    this.particles = [];
  }
}
