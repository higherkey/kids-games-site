import { BaseBusyBoardModule } from './BaseBusyBoardModule';
import type { LuminaryBoardGame } from '../LuminaryBoardGame';

export class ShadowProjection extends BaseBusyBoardModule {
  private readonly game: LuminaryBoardGame;

  private isDragging = false;
  private puckX = 0; // Relative coordinates inside card
  private puckY = 0;
  private setupDone = false;

  constructor(id: string, x: number, y: number, w: number, h: number, game: LuminaryBoardGame) {
    super(id, x, y, w, h);
    this.game = game;
  }

  private animPhase = 0;

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    this.animPhase += 0.05;
    const theme = this.game.getTheme();
    const margin = 12;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;
    const centerY = my + mh / 2;

    if (!this.setupDone) {
      this.puckX = centerX;
      this.puckY = centerY + 30;
      this.setupDone = true;
    }

    this.drawOuterFaceplate(ctx, theme, mx, my, mw, mh);

    // Title
    ctx.save();
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (theme === 'paper') {
      ctx.fillStyle = '#5A564C';
    } else {
      ctx.fillStyle = '#00FFCC';
      ctx.shadowColor = '#00FFCC';
      ctx.shadowBlur = 4;
    }
    ctx.fillText('SHADOW PROJECTION', centerX, my + 12);
    ctx.restore();

    // Touch Pad Grid
    const padMargin = 25;
    const padX = mx + padMargin;
    const padY = my + 35;
    const padW = mw - padMargin * 2;
    const padH = mh - 55;

    this.drawTouchPadGrid(ctx, theme, padX, padY, padW, padH);

    // Light Source drawing (Fixed point at top center of touch pad)
    const lightX = padX + padW / 2;
    const lightY = padY + 15;

    ctx.save();
    // Glowing beam lines from light source to puck
    ctx.strokeStyle = theme === 'paper' ? 'rgba(255, 165, 0, 0.15)' : 'rgba(0, 255, 204, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lightX, lightY);
    ctx.lineTo(this.puckX, this.puckY);
    ctx.stroke();

    // Light bulb icon
    ctx.fillStyle = theme === 'paper' ? '#FFA500' : '#00FFCC';
    if (theme === 'neon') {
      ctx.shadowColor = '#00FFCC';
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.arc(lightX, lightY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Calculate Shadow Offset (Casted away from light source)
    const dx = this.puckX - lightX;
    const dy = this.puckY - lightY;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    
    // Shadow projection geometry: closer to light = longer, wider shadow
    const shadowStretch = Math.max(10, 1200 / Math.max(40, distance));
    const shadowX = this.puckX + Math.cos(angle) * shadowStretch;
    const shadowY = this.puckY + Math.sin(angle) * shadowStretch;
    const shadowRadiusX = 20 + shadowStretch * 0.3;
    const shadowRadiusY = 14;

    // Render Shadow
    ctx.save();
    ctx.translate(shadowX, shadowY);
    ctx.rotate(angle);
    ctx.fillStyle = theme === 'paper' ? 'rgba(50, 45, 35, 0.35)' : 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 0, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Active Light Ripple Arcs
    if (this.isDragging) {
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const offset = ((this.animPhase + i * 0.8) % 2.5) * 12;
        const alpha = Math.max(0, 1 - offset / 30);
        ctx.strokeStyle = theme === 'paper' ? `rgba(230, 126, 34, ${alpha * 0.6})` : `rgba(0, 255, 204, ${alpha * 0.7})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.puckX, this.puckY, 20 + offset, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw the draggable puck
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.puckX, this.puckY, 20, 0, Math.PI * 2);
    if (theme === 'paper') {
      ctx.fillStyle = '#E67E22';
      ctx.strokeStyle = '#D35400';
    } else {
      ctx.fillStyle = '#282D37';
      ctx.strokeStyle = '#00FFCC';
    }
    ctx.lineWidth = 4;
    ctx.fill();
    ctx.stroke();

    // Puck inner circle style
    ctx.beginPath();
    ctx.arc(this.puckX, this.puckY, 8, 0, Math.PI * 2);
    ctx.fillStyle = theme === 'paper' ? '#F39C12' : '#0D1115';
    ctx.fill();
    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 12;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const padMargin = 25;
    const padX = mx + padMargin;
    const padY = my + 35;
    const padW = mw - padMargin * 2;
    const padH = mh - 55;

    // Check click on puck
    const dx = x - this.puckX;
    const dy = y - this.puckY;
    const dist = Math.hypot(dx, dy);

    if (dist <= 25) {
      this.isDragging = true;
      this.haptics.lightTap();
      return true;
    }

    // Direct jump on pad
    if (x >= padX && x <= padX + padW && y >= padY && y <= padY + padH) {
      this.isDragging = true;
      this.puckX = x;
      this.puckY = y;
      this.audio.play('synth:pluck', 180);
      this.haptics.lightTap();
      return true;
    }

    return false;
  }

  public handlePointerMove(x: number, y: number, px: number, py: number, pw: number, ph: number): void {
    if (!this.isDragging) return;

    const margin = 12;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const padMargin = 25;
    const padX = mx + padMargin;
    const padY = my + 35;
    const padW = mw - padMargin * 2;
    const padH = mh - 55;

    // Clamp coordinates to touch pad boundaries
    this.puckX = Math.max(padX + 20, Math.min(padX + padW - 20, x));
    this.puckY = Math.max(padY + 20, Math.min(padY + padH - 20, y));

    // Pitch follows drag distance
    const distFromCenter = Math.hypot(this.puckX - (padX + padW / 2), this.puckY - (padY + padH / 2));
    const pitch = 150 + distFromCenter * 1.5;

    if (Math.random() < 0.25) {
      this.audio.play('synth:click', pitch);
      this.haptics.lightTap();
    }
  }

  public handlePointerUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.audio.play('synth:pluck', 250);
    }
  }



  private drawOuterFaceplate(ctx: CanvasRenderingContext2D, theme: string, mx: number, my: number, mw: number, mh: number): void {
    ctx.save();
    ctx.shadowColor = theme === 'paper' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 255, 204, 0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    if (theme === 'paper') {
      ctx.fillStyle = '#FAF8F5';
      ctx.strokeStyle = '#D5C3A6';
    } else {
      ctx.fillStyle = '#1A1D24';
      ctx.strokeStyle = '#00FFCC';
    }
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();
    ctx.restore();
  }

  private drawTouchPadGrid(ctx: CanvasRenderingContext2D, theme: string, padX: number, padY: number, padW: number, padH: number): void {
    ctx.save();
    if (theme === 'paper') {
      ctx.fillStyle = '#F4EFE6';
      ctx.strokeStyle = '#E3DBCF';
    } else {
      ctx.fillStyle = '#0D1115';
      ctx.strokeStyle = '#1D252E';
    }
    ctx.lineWidth = 2;
    this.roundRect(ctx, padX, padY, padW, padH, 12);
    ctx.fill();
    ctx.stroke();

    // Grid lines inside pad
    ctx.strokeStyle = theme === 'paper' ? 'rgba(213, 195, 166, 0.4)' : 'rgba(0, 255, 204, 0.08)';
    ctx.lineWidth = 1;
    const numLines = 5;
    for (let i = 1; i < numLines; i++) {
      // vertical
      const lx = padX + (i / numLines) * padW;
      ctx.beginPath();
      ctx.moveTo(lx, padY);
      ctx.lineTo(lx, padY + padH);
      ctx.stroke();

      // horizontal
      const ly = padY + (i / numLines) * padH;
      ctx.beginPath();
      ctx.moveTo(padX, ly);
      ctx.lineTo(padX + padW, ly);
      ctx.stroke();
    }
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
