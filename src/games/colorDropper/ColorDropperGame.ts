import { BaseGame } from '../../core/BaseGame';
import { TranslationManager } from '../../core/TranslationManager';

type ColorChannel = 'red' | 'yellow' | 'blue';

interface ColorBlob {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  colorHex: string;
  colorName: string;
  components: { red: number; yellow: number; blue: number };
  isDragging: boolean;
  mergeCooldown: number; // in milliseconds
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

const COLOR_MAP: Record<string, string> = {
  red: '#FF5E5E',
  yellow: '#FFE66D',
  blue: '#4ECDC4',
  orange: '#FFA500',
  green: '#2ECC71',
  purple: '#9B59B6',
  brown: '#8B5A2B',
};

const COLOR_NAMES: Record<string, Record<string, string>> = {
  en: { red: 'Red', yellow: 'Yellow', blue: 'Blue', orange: 'Orange', green: 'Green', purple: 'Purple', brown: 'Brown' },
  es: { red: 'Rojo', yellow: 'Amarillo', blue: 'Azul', orange: 'Naranja', green: 'Verde', purple: 'Morado', brown: 'Marrón' },
  fr: { red: 'Rouge', yellow: 'Jaune', blue: 'Bleu', orange: 'Orange', green: 'Vert', purple: 'Violet', brown: 'Marron' },
  de: { red: 'Rot', yellow: 'Gelb', blue: 'Blau', orange: 'Orange', green: 'Grün', purple: 'Lila', brown: 'Braun' },
  it: { red: 'Rosso', yellow: 'Giallo', blue: 'Blu', orange: 'Arancione', green: 'Verde', purple: 'Viola', brown: 'Marrone' },
  pt: { red: 'Vermelho', yellow: 'Amarelo', blue: 'Azul', orange: 'Laranja', green: 'Verde', purple: 'Roxo', brown: 'Marrom' },
  ja: { red: '赤', yellow: '黄色', blue: '青', orange: 'オレンジ', green: '緑', purple: '紫', brown: '茶色' },
  ko: { red: '빨강', yellow: '노랑', blue: '파랑', orange: '주황', green: '초록', purple: '보라', brown: '갈색' },
  zh: { red: '红色', yellow: '黄色', blue: '蓝色', orange: '橙色', green: '绿色', purple: '紫色', brown: '棕色' },
  ru: { red: 'Красный', yellow: 'Желтый', blue: 'Синий', orange: 'Оранжевый', green: 'Зеленый', purple: 'Фиолетовый', brown: 'Коричневый' }
};

// Pre-computed reference colors for Euclidean name lookup — module-level to avoid per-call allocation
const COLOR_REFS: Array<{ name: string; r: number; g: number; b: number }> = [
  { name: 'red',    r: 255, g: 94,  b: 94  },
  { name: 'yellow', r: 255, g: 230, b: 109 },
  { name: 'blue',   r: 78,  g: 205, b: 196 },
  { name: 'orange', r: 255, g: 162, b: 102 },
  { name: 'green',  r: 167, g: 218, b: 153 },
  { name: 'purple', r: 167, g: 150, b: 145 },
  { name: 'brown',  r: 196, g: 176, b: 133 },
];

export class ColorDropperGame extends BaseGame {
  private blobs: ColorBlob[] = [];
  private particles: Particle[] = [];
  
  private draggingBlob: ColorBlob | null = null;
  private dragOffset = { x: 0, y: 0 };
  private clickStartTime = 0;
  private clickStartPos = { x: 0, y: 0 };
  
  private nextBlobId = 1;
  private readonly potsY = 70;
  private readonly potsHeight = 80;
  private pots: Array<{ color: string; labelKey: ColorChannel; x: number; width: number }> = [];
  private readonly ENTITY_LIMIT = 150;

  constructor() {
    super();
    this.audio.registerSound('bloop', '/sounds/pop.ogg');
    this.audio.registerSound('pop', '/sounds/pop.ogg');
  }

  protected onInit(): void {
    this.blobs = [];
    this.particles = [];
    this.draggingBlob = null;

    this.setupPots();

    this.canvas?.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas?.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas?.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.canvas?.addEventListener('mousedown', this.handleMouseDown);
    this.canvas?.addEventListener('mousemove', this.handleMouseMove);
    this.canvas?.addEventListener('mouseup', this.handleMouseUp);
  }

  private setupPots() {
    if (!this.canvas) return;
    const width = this.canvas.width;
    const potWidth = Math.min(100, width / 4);
    const spacing = (width - potWidth * 3) / 4;

    this.pots = [
      { color: COLOR_MAP.red, labelKey: 'red', x: spacing, width: potWidth },
      { color: COLOR_MAP.yellow, labelKey: 'yellow', x: spacing * 2 + potWidth, width: potWidth },
      { color: COLOR_MAP.blue, labelKey: 'blue', x: spacing * 3 + potWidth * 2, width: potWidth }
    ];
  }

  private getLanguage(): string {
    const code = TranslationManager.getCurrent().code;
    return code.split('-')[0];
  }

  private getColorName(key: string): string {
    const lang = this.getLanguage();
    const dict = COLOR_NAMES[lang] || COLOR_NAMES.en;
    return dict[key] || key;
  }

  private computeProgrammaticColor(components: { red: number; yellow: number; blue: number }): { colorHex: string; colorName: string } {
    const total = components.red + components.yellow + components.blue;
    if (total === 0) {
      return { colorHex: COLOR_MAP.red, colorName: 'red' };
    }

    // Weight interpolation: Red (255, 94, 94), Yellow (255, 230, 109), Blue (78, 205, 196)
    const r = Math.round((components.red * 255 + components.yellow * 255 + components.blue * 78) / total);
    const g = Math.round((components.red * 94 + components.yellow * 230 + components.blue * 205) / total);
    const b = Math.round((components.red * 94 + components.yellow * 109 + components.blue * 196) / total);
    const colorHex = `rgb(${r}, ${g}, ${b})`;

    // Euclidean distance lookup for closest standard color name (for voice TTS / labels)
    let minDistSq = Infinity;
    let closestName = 'red';
    for (const ref of COLOR_REFS) {
      const distSq = (r - ref.r) ** 2 + (g - ref.g) ** 2 + (b - ref.b) ** 2;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closestName = ref.name;
      }
    }

    return { colorHex, colorName: closestName };
  }

  private spawnBlob(type: ColorChannel, x: number, y: number) {
    // Entity Limit check: remove oldest non-dragging drop if at limit
    if (this.blobs.length >= this.ENTITY_LIMIT) {
      const indexToRemove = this.blobs.findIndex(b => !b.isDragging);
      if (indexToRemove !== -1) {
        this.blobs.splice(indexToRemove, 1);
      } else {
        // Fallback to removing first element if all are somehow dragging
        this.blobs.shift();
      }
    }

    const baseRadius = 45;
    const components = { red: 0, yellow: 0, blue: 0 };
    components[type] = 1;

    const { colorHex, colorName } = this.computeProgrammaticColor(components);

    this.blobs.push({
      id: this.nextBlobId++,
      x,
      y,
      vx: 0,
      vy: 100 + Math.random() * 50,
      radius: baseRadius,
      colorHex,
      colorName,
      components,
      isDragging: false,
      mergeCooldown: 0
    });

    this.audio.play('bloop');
    this.haptics.lightTap();
    this.createSplashParticles(x, y, COLOR_MAP[type], 8); // Reduced count for performance
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
    if (y >= this.potsY && y <= this.potsY + this.potsHeight) {
      for (const pot of this.pots) {
        if (x >= pot.x && x <= pot.x + pot.width) {
          this.spawnBlob(pot.labelKey, x, this.potsY + this.potsHeight + 30);
          return;
        }
      }
    }

    if (this.canvas && x > this.canvas.width - 70 && y < 60) {
      this.clearAll();
      return;
    }

    for (let i = this.blobs.length - 1; i >= 0; i--) {
      const b = this.blobs[i];
      const distSq = (x - b.x) ** 2 + (y - b.y) ** 2;
      if (distSq < b.radius * b.radius) {
        this.draggingBlob = b;
        b.isDragging = true;
        this.dragOffset = { x: x - b.x, y: y - b.y };
        this.clickStartTime = Date.now();
        this.clickStartPos = { x, y };
        this.haptics.lightTap();
        break;
      }
    }
  }

  private movePress(x: number, y: number) {
    if (this.draggingBlob && this.canvas) {
      const b = this.draggingBlob;
      b.x = Math.max(b.radius, Math.min(x - this.dragOffset.x, this.canvas.width - b.radius));
      b.y = Math.max(b.radius + this.potsHeight + 20, Math.min(y - this.dragOffset.y, this.canvas.height - b.radius));
      b.vx = 0;
      b.vy = 0;
    }
  }

  private endPress() {
    if (this.draggingBlob) {
      const clickDuration = Date.now() - this.clickStartTime;
      const distMoved = Math.hypot(
        this.draggingBlob.x + this.dragOffset.x - this.clickStartPos.x,
        this.draggingBlob.y + this.dragOffset.y - this.clickStartPos.y
      );

      if (clickDuration < 250 && distMoved < 15) {
        this.trySplitBlob(this.draggingBlob);
      }

      if (this.draggingBlob) {
        this.draggingBlob.isDragging = false;
        this.draggingBlob = null;
      }
    }
  }

  private trySplitBlob(b: ColorBlob) {
    const total = b.components.red + b.components.yellow + b.components.blue;
    if (total <= 1) return;

    this.blobs = this.blobs.filter(x => x.id !== b.id);

    const primaries: Array<'red' | 'yellow' | 'blue'> = [];
    for (let i = 0; i < b.components.red; i++) primaries.push('red');
    for (let i = 0; i < b.components.yellow; i++) primaries.push('yellow');
    for (let i = 0; i < b.components.blue; i++) primaries.push('blue');

    const splitCount = primaries.length;
    primaries.forEach((type, idx) => {
      const angle = (idx / splitCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 150 + Math.random() * 50;
      const offsetDist = b.radius * 0.6;

      const spawnX = Math.max(45, Math.min(b.x + Math.cos(angle) * offsetDist, this.canvas!.width - 45));
      const spawnY = Math.max(this.potsHeight + 70, Math.min(b.y + Math.sin(angle) * offsetDist, this.canvas!.height - 45));

      const newComponents = { red: 0, yellow: 0, blue: 0 };
      newComponents[type] = 1;
      const { colorHex, colorName } = this.computeProgrammaticColor(newComponents);

      const newBlob: ColorBlob = {
        id: this.nextBlobId++,
        x: spawnX,
        y: spawnY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 45,
        colorHex,
        colorName,
        components: newComponents,
        isDragging: false,
        mergeCooldown: 800 // Recombination cooldown enabled!
      };

      this.blobs.push(newBlob);
    });

    this.audio.play('pop');
    this.haptics.lightTap();
    this.createSplashParticles(b.x, b.y, b.colorHex, 10);
  }

  private clearAll() {
    this.blobs.forEach(b => {
      this.createSplashParticles(b.x, b.y, b.colorHex, 5);
    });
    this.blobs = [];
    this.audio.play('pop');
    this.haptics.lightTap();
  }

  private checkBlobMerges() {
    for (let i = 0; i < this.blobs.length; i++) {
      for (let j = i + 1; j < this.blobs.length; j++) {
        if (this.tryMergeBlobs(i, j)) {
          return;
        }
      }
    }
  }

  private tryMergeBlobs(i: number, j: number): boolean {
    const b1 = this.blobs[i];
    const b2 = this.blobs[j];

    // Skip merge if either blob is on cooldown
    if (b1.mergeCooldown > 0 || b2.mergeCooldown > 0) return false;

    const dx = b2.x - b1.x;
    const dy = b2.y - b1.y;
    
    // Performance: Use squared distance to avoid Math.sqrt in check
    const distSq = dx * dx + dy * dy;
    const mergeThreshold = (b1.radius + b2.radius) * 0.85;

    if (distSq >= mergeThreshold * mergeThreshold) return false;

    const totalMass = b1.radius * b1.radius + b2.radius * b2.radius;
    const newRadius = Math.min(100, Math.sqrt(totalMass));

    const newX = (b1.x * (b1.radius * b1.radius) + b2.x * (b2.radius * b2.radius)) / totalMass;
    const newY = (b1.y * (b1.radius * b1.radius) + b2.y * (b2.radius * b2.radius)) / totalMass;

    const newComponents = {
      red: b1.components.red + b2.components.red,
      yellow: b1.components.yellow + b2.components.yellow,
      blue: b1.components.blue + b2.components.blue,
    };

    const { colorHex: newHex, colorName: newName } = this.computeProgrammaticColor(newComponents);
    const oldColorName1 = b1.colorName;

    b1.x = newX;
    b1.y = newY;
    b1.radius = newRadius;
    b1.components = newComponents;
    b1.colorHex = newHex;
    b1.colorName = newName;

    if (!b1.isDragging && b2.isDragging) {
      b1.isDragging = true;
      this.draggingBlob = b1;
    }

    this.blobs.splice(j, 1);

    this.audio.play('bloop');
    this.haptics.lightTap();
    this.createSplashParticles(newX, newY, newHex, 8);

    if (newName !== oldColorName1) {
      const langCode = TranslationManager.getCurrent().code;
      const spokenText = this.getColorName(newName);
      this.audio.speak(spokenText, langCode);
    }

    return true;
  }

  private createSplashParticles(x: number, y: number, color: string, count: number) {
    // Limit total active particles to keep performance fast
    if (this.particles.length >= 100) return;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2 + Math.random() * 3,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6
      });
    }
  }

  update(dt: number): void {
    if (!this.canvas) return;

    const dtSec = dt / 1000;
    const dtMs = dt;

    this.blobs.forEach(b => {
      // Decrement merge cooldown
      if (b.mergeCooldown > 0) {
        b.mergeCooldown = Math.max(0, b.mergeCooldown - dtMs);
      }

      if (b.isDragging) return;

      b.vy += 80 * dtSec;
      
      b.vx *= 0.98;
      b.vy *= 0.98;

      b.x += b.vx * dtSec;
      b.y += b.vy * dtSec;

      const bounce = -0.4;
      const bottomLimit = this.canvas!.height - b.radius;
      const topLimit = this.potsHeight + this.potsY + 20 + b.radius;

      if (b.y > bottomLimit) {
        b.y = bottomLimit;
        b.vy *= bounce;
      }
      if (b.y < topLimit) {
        b.y = topLimit;
        b.vy *= bounce;
      }
      if (b.x < b.radius) {
        b.x = b.radius;
        b.vx *= bounce;
      }
      if (b.x > this.canvas!.width - b.radius) {
        b.x = this.canvas!.width - b.radius;
        b.vx *= bounce;
      }
    });

    this.checkBlobMerges();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.vy += 120 * dtSec;
      p.life -= dtSec;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.render();
  }

  private render() {
    if (!this.ctx || !this.canvas) return;
    
    // Performance optimization: cleared canvas drawing
    this.ctx.fillStyle = '#F4ECD8';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Ceramic border line
    this.ctx.strokeStyle = '#D4B896';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.potsY + this.potsHeight + 10);
    this.ctx.lineTo(this.canvas.width, this.potsY + this.potsHeight + 10);
    this.ctx.stroke();

    // Draw paint wells
    this.pots.forEach(pot => {
      this.ctx!.fillStyle = 'rgba(43, 45, 94, 0.08)';
      this.ctx!.beginPath();
      this.ctx!.roundRect(pot.x + 3, this.potsY + 3, pot.width, this.potsHeight, 14);
      this.ctx!.fill();

      this.ctx!.fillStyle = '#ffffff';
      this.ctx!.strokeStyle = '#2B2D5E';
      this.ctx!.lineWidth = 3;
      this.ctx!.beginPath();
      this.ctx!.roundRect(pot.x, this.potsY, pot.width, this.potsHeight, 14);
      this.ctx!.fill();
      this.ctx!.stroke();

      this.ctx!.fillStyle = pot.color;
      this.ctx!.beginPath();
      this.ctx!.roundRect(pot.x + 8, this.potsY + 24, pot.width - 16, this.potsHeight - 32, 8);
      this.ctx!.fill();

      this.ctx!.fillStyle = '#2B2D5E';
      this.ctx!.beginPath();
      this.ctx!.roundRect(pot.x + pot.width * 0.15, this.potsY - 6, pot.width * 0.7, 10, 4);
      this.ctx!.fill();

      this.ctx!.fillStyle = '#2B2D5E';
      this.ctx!.font = 'bold 13px Fredoka, sans-serif';
      this.ctx!.textAlign = 'center';
      this.ctx!.textBaseline = 'bottom';
      this.ctx!.fillText(this.getColorName(pot.labelKey).toUpperCase(), pot.x + pot.width / 2, this.potsY + this.potsHeight - 12);
    });

    // Clear (X) Button
    const rx = this.canvas.width - 60;
    const ry = 25;
    this.ctx.fillStyle = '#C0392B';
    this.ctx.strokeStyle = '#2B2D5E';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.arc(rx, ry, 18, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('✕', rx, ry + 1);

    // Info Text
    this.ctx.fillStyle = 'rgba(43, 45, 94, 0.6)';
    this.ctx.font = '500 15px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('Tap jars to drop paint • Drag to mix • Tap color to split!', this.canvas.width / 2, 20);

    // Draw Blobs
    this.blobs.forEach(blob => {
      // DRAW SHADOW: optimized flat offset shadow circle (zero expensive blur)
      this.ctx!.fillStyle = 'rgba(43, 45, 94, 0.12)';
      this.ctx!.beginPath();
      this.ctx!.arc(blob.x, blob.y + 5, blob.radius, 0, Math.PI * 2);
      this.ctx!.fill();

      // DRAW BLOB BODY: solid color fill (zero dynamic radial gradient creation)
      this.ctx!.fillStyle = blob.colorHex;
      this.ctx!.strokeStyle = '#2B2D5E';
      this.ctx!.lineWidth = 3.5;
      this.ctx!.beginPath();
      this.ctx!.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
      this.ctx!.fill();
      this.ctx!.stroke();

      // DRAW SHINY HIGHLIGHT: flat translucent bubble highlight arc/circle overlay
      this.ctx!.fillStyle = 'rgba(255, 255, 255, 0.35)';
      this.ctx!.beginPath();
      this.ctx!.arc(blob.x - blob.radius * 0.35, blob.y - blob.radius * 0.35, blob.radius * 0.22, 0, Math.PI * 2);
      this.ctx!.fill();

      // DRAW DRAG RING if dragging
      if (blob.isDragging) {
        this.ctx!.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx!.lineWidth = 2;
        this.ctx!.beginPath();
        this.ctx!.arc(blob.x, blob.y, blob.radius + 4, 0, Math.PI * 2);
        this.ctx!.stroke();
      }

      // DRAW TEXT LABEL: Only for larger drops to keep layout readable and optimized
      if (blob.radius >= 35) {
        this.ctx!.fillStyle = '#2B2D5E';
        const fontSize = Math.max(12, Math.floor(blob.radius * 0.3));
        this.ctx!.font = `bold ${fontSize}px Fredoka, sans-serif`;
        this.ctx!.textAlign = 'center';
        this.ctx!.textBaseline = 'middle';
        const label = this.getColorName(blob.colorName);
        
        this.ctx!.strokeStyle = '#ffffff';
        this.ctx!.lineWidth = 3;
        this.ctx!.strokeText(label, blob.x, blob.y);
        this.ctx!.fillText(label, blob.x, blob.y);
      }
    });

    // Draw Particles
    this.particles.forEach(p => {
      this.ctx!.fillStyle = p.color;
      this.ctx!.globalAlpha = Math.max(0, p.life / p.maxLife);
      this.ctx!.beginPath();
      this.ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx!.fill();
    });
    this.ctx.globalAlpha = 1.0;
  }



  destroy(): void {
    window.speechSynthesis?.cancel();
    if (this.canvas) {
      this.canvas.removeEventListener('touchstart', this.handleTouchStart);
      this.canvas.removeEventListener('touchmove', this.handleTouchMove);
      this.canvas.removeEventListener('touchend', this.handleTouchEnd);
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    }
  }
}
