import type { Game } from '../../core/Game';
import { AudioController } from '../../core/AudioController';
import { HapticController } from '../../core/HapticController';

export interface PegColor {
  name: string;
  color: string;
  glow: string;
  isEraser?: boolean;
}

export type TemplateName = 'None' | 'Heart' | 'Star' | 'Butterfly' | 'Rocket';

interface PegGridCell {
  col: number;
  row: number;
  colorIndex: number | null; // index into colors array, null = empty
  pulse: number; // 0 to 1 for tap animation
}

interface ParticleSweep {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export class LiteBriteGame implements Game {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private readonly audio: AudioController;
  private readonly haptics: HapticController;
  private paused: boolean = false;

  public readonly cols: number = 16;
  public readonly rows: number = 12;
  private grid: PegGridCell[][] = [];

  public readonly colors: PegColor[] = [
    { name: 'Neon Red', color: '#FF2A6D', glow: '#FF5C8D' },
    { name: 'Cyan', color: '#05D9E8', glow: '#67F6FF' },
    { name: 'Yellow', color: '#FFE600', glow: '#FFF36B' },
    { name: 'Lime', color: '#00FF66', glow: '#66FF99' },
    { name: 'Magenta', color: '#D100D1', glow: '#FF4DFF' },
    { name: 'Orange', color: '#FF7700', glow: '#FFA04D' },
    { name: 'White', color: '#FFFFFF', glow: '#E6F0FF' },
    { name: 'Eraser', color: '#334155', glow: '#475569', isEraser: true },
  ];

  public selectedColorIndex: number = 0;
  public selectedTemplate: TemplateName = 'None';

  // Area bounds
  private paletteBarHeight = 60;
  private topBarHeight = 50;
  private gridArea = { x: 0, y: 50, width: 800, height: 500 };
  private cellRadius = 12;

  private isDragging: boolean = false;
  private particles: ParticleSweep[] = [];
  private sweepAnimationProgress: number = -1; // -1 if not sweeping, 0 to 1 if active

  constructor() {
    this.audio = AudioController.getInstance();
    this.haptics = HapticController.getInstance();
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.selectedColorIndex = 0;
    this.selectedTemplate = 'None';
    this.sweepAnimationProgress = -1;
    this.particles = [];

    this.initGrid();

    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mouseup', this.handleMouseUp);
    canvas.addEventListener('mouseleave', this.handleMouseUp);

    canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.handleTouchEnd);
    canvas.addEventListener('touchcancel', this.handleTouchEnd);
  }

  private initGrid(): void {
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      const row: PegGridCell[] = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({ col: c, row: r, colorIndex: null, pulse: 0 });
      }
      this.grid.push(row);
    }
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
    this.handleInteraction(pos.x, pos.y);
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.paused || !this.isDragging) return;
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.handleInteraction(pos.x, pos.y);
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
      this.handleInteraction(pos.x, pos.y);
    });
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (this.paused || !this.isDragging) return;
    e.preventDefault();
    Array.from(e.changedTouches).forEach(touch => {
      const pos = this.getCanvasPos(touch.clientX, touch.clientY);
      this.handleInteraction(pos.x, pos.y);
    });
  };

  private handleTouchEnd = () => {
    this.isDragging = false;
  };

  private handleInteraction(x: number, y: number): void {
    if (!this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Check Palette Bar (bottom)
    if (y >= h - this.paletteBarHeight) {
      const pad = 10;
      const paletteWidth = w - pad * 2;
      const btnW = paletteWidth / this.colors.length;
      const clickedIdx = Math.floor((x - pad) / btnW);
      if (clickedIdx >= 0 && clickedIdx < this.colors.length) {
        this.selectedColorIndex = clickedIdx;
        this.audio.play('synth:click', 'C5');
        this.haptics.lightTap();
      }
      return;
    }

    // Check Top Bar (templates & clear button)
    if (y <= this.topBarHeight) {
      // Clear button on the right
      const clearBtnWidth = 90;
      if (x >= w - clearBtnWidth - 15 && x <= w - 15) {
        this.clearBoard();
        return;
      }

      // Template selection buttons on the left/center
      const templates: TemplateName[] = ['None', 'Heart', 'Star', 'Butterfly', 'Rocket'];
      const tmplBtnW = 75;
      const startX = 15;
      for (let i = 0; i < templates.length; i++) {
        const bx = startX + i * (tmplBtnW + 8);
        if (x >= bx && x <= bx + tmplBtnW) {
          this.selectedTemplate = templates[i];
          this.audio.play('synth:click', 'E5');
          this.haptics.lightTap();
          break;
        }
      }
      return;
    }

    // Check Grid Pegboard
    const gridW = w - 40;
    const gridH = h - this.topBarHeight - this.paletteBarHeight - 20;
    const gridX = 20;
    const gridY = this.topBarHeight + 10;

    if (x >= gridX && x <= gridX + gridW && y >= gridY && y <= gridY + gridH) {
      const cellW = gridW / this.cols;
      const cellH = gridH / this.rows;

      const c = Math.floor((x - gridX) / cellW);
      const r = Math.floor((y - gridY) / cellH);

      if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
        const cell = this.grid[r][c];
        const isEraser = this.colors[this.selectedColorIndex].isEraser;
        const newColorIdx = isEraser ? null : this.selectedColorIndex;

        if (cell.colorIndex !== newColorIdx) {
          cell.colorIndex = newColorIdx;
          cell.pulse = 1.0;
          this.audio.play('synth:click', isEraser ? 'G3' : 'G4');
          this.haptics.lightTap();
        }
      }
    }
  }

  public clearBoard(): void {
    this.sweepAnimationProgress = 0;
    this.audio.play('synth:click', 'C6');
    this.haptics.heavyImpact();

    // Spawn sweep particles
    if (this.canvas) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      for (let i = 0; i < 40; i++) {
        this.particles.push({
          x: 0,
          y: Math.random() * h,
          vx: Math.random() * 8 + 6,
          vy: (Math.random() - 0.5) * 3,
          life: 1.0,
          color: this.colors[Math.floor(Math.random() * (this.colors.length - 1))].glow,
        });
      }
    }

    // Clear all grid peg entries
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c].colorIndex = null;
      }
    }
  }

  public getGrid(): PegGridCell[][] {
    return this.grid;
  }

  update(dt: number): void {
    if (!this.canvas || !this.ctx || this.paused) return;

    // Update cell pulse animations
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c].pulse > 0) {
          this.grid[r][c].pulse = Math.max(0, this.grid[r][c].pulse - dt * 0.005);
        }
      }
    }

    // Update sweep animation progress
    if (this.sweepAnimationProgress >= 0) {
      this.sweepAnimationProgress += dt * 0.002;
      if (this.sweepAnimationProgress >= 1) {
        this.sweepAnimationProgress = -1;
      }
    }

    // Update sweep particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt * 0.002;
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

    // Background - Dark metallic board
    this.ctx.fillStyle = '#0F172A';
    this.ctx.fillRect(0, 0, w, h);

    // Draw Top Bar (Templates & Clear)
    this.renderTopBar(w);

    // Draw Pegboard Grid
    const gridW = w - 40;
    const gridH = h - this.topBarHeight - this.paletteBarHeight - 20;
    const gridX = 20;
    const gridY = this.topBarHeight + 10;
    const cellW = gridW / this.cols;
    const cellH = gridH / this.rows;
    this.cellRadius = Math.min(cellW, cellH) * 0.35;

    // Outer frame of pegboard
    this.ctx.save();
    this.ctx.fillStyle = '#1E293B';
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 3;
    this.roundRect(gridX - 10, gridY - 10, gridW + 20, gridH + 20, 16);
    this.ctx.fill();
    this.ctx.stroke();

    // Board holes and glowing pegs
    const templateDots = this.getTemplateGuideDots();

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cx = gridX + c * cellW + cellW / 2;
        const cy = gridY + r * cellH + cellH / 2;
        const cell = this.grid[r][c];

        // Empty dark socket hole
        this.ctx.fillStyle = '#020617';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, this.cellRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Guide dots if template selected and socket is empty
        if (cell.colorIndex === null && templateDots.has(`${c},${r}`)) {
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
          this.ctx.fill();
        }

        // Draw filled peg
        if (cell.colorIndex !== null) {
          const peg = this.colors[cell.colorIndex];
          const radiusScale = 1 + cell.pulse * 0.3;
          const currentRadius = this.cellRadius * radiusScale;

          // Translucent outer glow
          this.ctx.save();
          this.ctx.shadowColor = peg.glow;
          this.ctx.shadowBlur = 18;
          this.ctx.fillStyle = peg.glow;
          this.ctx.globalAlpha = 0.85;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, currentRadius * 1.1, 0, Math.PI * 2);
          this.ctx.fill();

          // Acrylic core body
          this.ctx.globalAlpha = 1.0;
          const grad = this.ctx.createRadialGradient(cx - currentRadius * 0.3, cy - currentRadius * 0.3, currentRadius * 0.1, cx, cy, currentRadius);
          grad.addColorStop(0, '#FFFFFF');
          grad.addColorStop(0.4, peg.color);
          grad.addColorStop(1, peg.glow);
          this.ctx.fillStyle = grad;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.restore();
        }
      }
    }
    this.ctx.restore();

    // Draw Palette Bar (Bottom)
    this.renderPaletteBar(w, h);

    // Draw light sweep effect on clear
    if (this.sweepAnimationProgress >= 0) {
      const sweepX = this.sweepAnimationProgress * w;
      const sweepGrad = this.ctx.createLinearGradient(sweepX - 60, 0, sweepX + 60, 0);
      sweepGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sweepGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
      sweepGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.ctx.fillStyle = sweepGrad;
      this.ctx.fillRect(0, 0, w, h);
    }

    // Draw particles
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private renderTopBar(w: number): void {
    if (!this.ctx) return;
    this.ctx.save();

    // Template selection buttons
    const templates: TemplateName[] = ['None', 'Heart', 'Star', 'Butterfly', 'Rocket'];
    const tmplBtnW = 75;
    const tmplBtnH = 34;
    const startX = 15;
    const startY = 8;

    for (let i = 0; i < templates.length; i++) {
      const name = templates[i];
      const bx = startX + i * (tmplBtnW + 8);
      const isSelected = this.selectedTemplate === name;

      this.ctx.fillStyle = isSelected ? '#3B82F6' : '#1E293B';
      this.ctx.strokeStyle = isSelected ? '#60A5FA' : '#334155';
      this.ctx.lineWidth = 2;
      this.roundRect(bx, startY, tmplBtnW, tmplBtnH, 12);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = isSelected ? '#FFFFFF' : '#94A3B8';
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(name, bx + tmplBtnW / 2, startY + tmplBtnH / 2);
    }

    // Clear Button
    const clearBtnW = 90;
    const clearBtnH = 34;
    const clearX = w - clearBtnW - 15;

    this.ctx.fillStyle = '#EF4444';
    this.ctx.strokeStyle = '#F87171';
    this.ctx.lineWidth = 2;
    this.roundRect(clearX, startY, clearBtnW, clearBtnH, 12);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 13px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('✨ Clear', clearX + clearBtnW / 2, startY + clearBtnH / 2);

    this.ctx.restore();
  }

  private renderPaletteBar(w: number, h: number): void {
    if (!this.ctx) return;
    this.ctx.save();

    const barY = h - this.paletteBarHeight;
    this.ctx.fillStyle = '#0F172A';
    this.ctx.fillRect(0, barY, w, this.paletteBarHeight);

    const pad = 10;
    const paletteWidth = w - pad * 2;
    const btnW = paletteWidth / this.colors.length;

    for (let i = 0; i < this.colors.length; i++) {
      const peg = this.colors[i];
      const bx = pad + i * btnW;
      const by = barY + 8;
      const bw = btnW - 6;
      const bh = this.paletteBarHeight - 16;
      const isSelected = this.selectedColorIndex === i;

      this.ctx.fillStyle = isSelected ? '#334155' : '#1E293B';
      this.ctx.strokeStyle = isSelected ? peg.glow : '#334155';
      this.ctx.lineWidth = isSelected ? 3 : 1;
      this.roundRect(bx, by, bw, bh, 14);
      this.ctx.fill();
      this.ctx.stroke();

      // Swatch circle/icon
      const cx = bx + bw / 2;
      const cy = by + bh / 2;
      if (peg.isEraser) {
        this.ctx.fillStyle = '#94A3B8';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🧹', cx, cy);
      } else {
        this.ctx.shadowColor = peg.glow;
        this.ctx.shadowBlur = isSelected ? 12 : 4;
        this.ctx.fillStyle = peg.color;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, isSelected ? 13 : 10, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    this.ctx.restore();
  }

  private getTemplateGuideDots(): Set<string> {
    const dots = new Set<string>();
    if (this.selectedTemplate === 'None') return dots;

    // Heart Template
    if (this.selectedTemplate === 'Heart') {
      const coords = [
        [4, 3], [5, 2], [6, 2], [7, 3], [8, 3], [9, 2], [10, 2], [11, 3],
        [3, 4], [7, 4], [8, 4], [12, 4],
        [3, 5], [12, 5],
        [4, 6], [11, 6],
        [5, 7], [10, 7],
        [6, 8], [9, 8],
        [7, 9], [8, 9]
      ];
      coords.forEach(([c, r]) => dots.add(`${c},${r}`));
    } else if (this.selectedTemplate === 'Star') {
      const coords = [
        [7, 1], [8, 1],
        [7, 2], [8, 2],
        [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5],
        [3, 6], [4, 6], [11, 6], [12, 6],
        [5, 7], [6, 7], [9, 7], [10, 7],
        [6, 8], [9, 8],
        [4, 9], [5, 9], [10, 9], [11, 9],
        [3, 10], [12, 10]
      ];
      coords.forEach(([c, r]) => dots.add(`${c},${r}`));
    } else if (this.selectedTemplate === 'Butterfly') {
      const coords = [
        [7, 2], [8, 2],
        [7, 3], [8, 3], [4, 3], [11, 3],
        [3, 4], [5, 4], [7, 4], [8, 4], [10, 4], [12, 4],
        [2, 5], [6, 5], [7, 5], [8, 5], [9, 5], [13, 5],
        [3, 6], [5, 6], [7, 6], [8, 6], [10, 6], [12, 6],
        [4, 7], [7, 7], [8, 7], [11, 7],
        [7, 8], [8, 8], [5, 8], [10, 8]
      ];
      coords.forEach(([c, r]) => dots.add(`${c},${r}`));
    } else if (this.selectedTemplate === 'Rocket') {
      const coords = [
        [7, 1], [8, 1],
        [6, 2], [7, 2], [8, 2], [9, 2],
        [6, 3], [7, 3], [8, 3], [9, 3],
        [6, 4], [7, 4], [8, 4], [9, 4],
        [6, 5], [7, 5], [8, 5], [9, 5],
        [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6],
        [3, 7], [6, 7], [7, 7], [8, 7], [9, 7], [12, 7],
        [7, 8], [8, 8],
        [6, 9], [7, 9], [8, 9], [9, 9]
      ];
      coords.forEach(([c, r]) => dots.add(`${c},${r}`));
    }

    return dots;
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
    this.grid = [];
    this.particles = [];
  }
}
