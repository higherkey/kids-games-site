import { BaseBusyBoardModule } from './BaseBusyBoardModule';
import type { LuminaryBoardGame } from '../LuminaryBoardGame';

export class DualFingerGradient extends BaseBusyBoardModule {
  private readonly game: LuminaryBoardGame;

  private isDragging = false;
  private draggedNode: 'p1' | 'p2' | null = null;
  private p1 = { x: 0, y: 0 };
  private p2 = { x: 0, y: 0 };
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
    const centerY = my + mh / 2 + 10;

    const padMargin = 25;
    const padX = mx + padMargin;
    const padY = my + 35;
    const padW = mw - padMargin * 2;
    const padH = mh - 55;

    if (!this.setupDone) {
      this.p1 = { x: centerX - 35, y: centerY };
      this.p2 = { x: centerX + 35, y: centerY };
      this.setupDone = true;
    }

    // Faceplate
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
    ctx.fillText('FLUID GRADIENT', centerX, my + 12);
    ctx.restore();

    // Drawing the Canvas Pad with the active gradient
    ctx.save();
    this.roundRect(ctx, padX, padY, padW, padH, 12);
    ctx.clip();

    // Draw the gradient background between p1 and p2
    const grad = ctx.createLinearGradient(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
    if (theme === 'paper') {
      grad.addColorStop(0, '#FFE29A');
      grad.addColorStop(1, '#FFA585');
    } else {
      grad.addColorStop(0, '#FF007F');
      grad.addColorStop(1, '#00FFCC');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(padX, padY, padW, padH);

    // Draw grid overlay on top of gradient
    ctx.strokeStyle = theme === 'paper' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    const numLines = 5;
    for (let i = 1; i < numLines; i++) {
      const lx = padX + (i / numLines) * padW;
      ctx.beginPath();
      ctx.moveTo(lx, padY);
      ctx.lineTo(lx, padY + padH);
      ctx.stroke();

      const ly = padY + (i / numLines) * padH;
      ctx.beginPath();
      ctx.moveTo(padX, ly);
      ctx.lineTo(padX + padW, ly);
      ctx.stroke();
    }

    // Draw connecting fluid neon line
    ctx.strokeStyle = theme === 'paper' ? 'rgba(255,255,255,0.7)' : '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.p1.x, this.p1.y);
    ctx.lineTo(this.p2.x, this.p2.y);
    ctx.stroke();

    // Draw Node Points
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Active Fluid Aura Ripples around active node
    if (this.isDragging && this.draggedNode) {
      const activePt = this.draggedNode === 'p1' ? this.p1 : this.p2;
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const offset = ((this.animPhase + i * 0.8) % 2.5) * 10;
        const alpha = Math.max(0, 1 - offset / 25);
        ctx.strokeStyle = theme === 'paper' ? `rgba(255, 255, 255, ${alpha * 0.7})` : `rgba(0, 255, 204, ${alpha * 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(activePt.x, activePt.y, 12 + offset, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw handle 1 (p1)
    ctx.beginPath();
    ctx.arc(this.p1.x, this.p1.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = theme === 'paper' ? 'rgba(90, 86, 76, 0.2)' : 'rgba(0, 255, 204, 0.3)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.p1.x, this.p1.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.p1.x, this.p1.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = theme === 'paper' ? '#FFA585' : '#FF007F';
    ctx.fill();

    // Draw handle 2 (p2)
    ctx.beginPath();
    ctx.arc(this.p2.x, this.p2.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = theme === 'paper' ? 'rgba(90, 86, 76, 0.2)' : 'rgba(0, 255, 204, 0.3)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.p2.x, this.p2.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.p2.x, this.p2.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = theme === 'paper' ? '#FFE29A' : '#00FFCC';
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

    const d1 = Math.hypot(x - this.p1.x, y - this.p1.y);
    const d2 = Math.hypot(x - this.p2.x, y - this.p2.y);
    const hitRadius = 25;

    if (d1 <= hitRadius || d2 <= hitRadius) {
      this.isDragging = true;
      this.draggedNode = d1 <= d2 ? 'p1' : 'p2';
      this.audio.play('synth:pluck', this.draggedNode === 'p1' ? 350 : 450);
      this.haptics.lightTap();
      return true;
    }

    if (x >= padX && x <= padX + padW && y >= padY && y <= padY + padH) {
      this.isDragging = true;
      this.draggedNode = d1 <= d2 ? 'p1' : 'p2';
      this[this.draggedNode].x = x;
      this[this.draggedNode].y = y;
      
      this.audio.play('synth:pluck', this.draggedNode === 'p1' ? 350 : 450);
      this.haptics.lightTap();
      return true;
    }
    return false;
  }

  public handlePointerMove(x: number, y: number, px: number, py: number, pw: number, ph: number): void {
    if (!this.isDragging || !this.draggedNode) return;

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

    this[this.draggedNode].x = Math.max(padX + 15, Math.min(padX + padW - 15, x));
    this[this.draggedNode].y = Math.max(padY + 15, Math.min(padY + padH - 15, y));

    if (Math.random() < 0.15) {
      const pitch = 200 + ((this[this.draggedNode].x - padX) / padW) * 400;
      this.audio.play('synth:pluck', pitch);
      this.haptics.lightTap();
    }
  }

  public handlePointerUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.draggedNode = null;
      this.audio.play('synth:pluck', 440);
    }
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
