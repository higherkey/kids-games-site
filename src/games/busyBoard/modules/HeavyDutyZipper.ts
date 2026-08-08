import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class HeavyDutyZipper extends BaseBusyBoardModule {
  private isDragging = false;
  private zipValue = 0.0; // 0.0 (fully closed at top) to 1.0 (fully open at bottom)
  private lastTickValue = 0.0;

  constructor(id: string, x: number, y: number, w: number, h: number) {
    super(id, x, y, w, h);
  }

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;
    const zipStartY = my + mh * 0.25;
    const zipEndY = my + mh * 0.85;
    const zipHeight = zipEndY - zipStartY;

    // Faceplate - Leather/Fabric texture look
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;

    const faceGrad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
    faceGrad.addColorStop(0, '#5D4037'); // warm brown leather
    faceGrad.addColorStop(1, '#3E2723');
    ctx.fillStyle = faceGrad;

    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Rivets
    ctx.fillStyle = '#CCD1D9';
    ctx.beginPath();
    ctx.arc(mx + 15, my + 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + mw - 15, my + 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + 15, my + mh - 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + mw - 15, my + mh - 15, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Title
    ctx.fillStyle = '#D7CCC8';
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('HEAVY-DUTY ZIPPER', mx + mw / 2, my + 15);
    ctx.restore();

    // --- DRAW ZIPPER SPLIT AREA ---
    ctx.save();
    // Expose a cute, contrasting denim fabric texture below (grows with zipValue)
    const currentZipY = zipStartY + this.zipValue * zipHeight;
    
    if (this.zipValue > 0.02) {
      ctx.fillStyle = '#3F51B5'; // Indigo denim color
      ctx.strokeStyle = '#303F9F';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(centerX, zipStartY);
      // Triangle split representing zipper opening
      ctx.lineTo(centerX - (this.zipValue * mw * 0.35), currentZipY);
      ctx.lineTo(centerX + (this.zipValue * mw * 0.35), currentZipY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Stitching lines inside split fabric
      ctx.strokeStyle = '#FFEB3B'; // yellow stitching
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(centerX, zipStartY);
      ctx.lineTo(centerX - (this.zipValue * mw * 0.35), currentZipY);
      ctx.moveTo(centerX, zipStartY);
      ctx.lineTo(centerX + (this.zipValue * mw * 0.35), currentZipY);
      ctx.stroke();
    }
    ctx.restore();

    // --- DRAW ZIPPER TEETH ---
    ctx.save();
    ctx.strokeStyle = '#7F8C8D';
    ctx.lineWidth = 2.5;

    // Remaining closed segment teeth
    const numTeeth = 30;
    for (let i = 0; i <= numTeeth; i++) {
      const fraction = i / numTeeth;
      const teethY = zipStartY + fraction * zipHeight;

      if (teethY > currentZipY) {
        // Draw interlocking left/right teeth
        ctx.beginPath();
        if (i % 2 === 0) {
          ctx.moveTo(centerX - 5, teethY);
          ctx.lineTo(centerX + 1, teethY);
        } else {
          ctx.moveTo(centerX - 1, teethY);
          ctx.lineTo(centerX + 5, teethY);
        }
        ctx.stroke();
      }
    }
    ctx.restore();

    // --- DRAW ZIPPER SLIDER / PULL TAB ---
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    // Chrome slider body
    const sliderW = 16;
    const sliderH = 22;
    ctx.fillStyle = '#CCD1D9';
    ctx.strokeStyle = '#434A54';
    ctx.lineWidth = 2;
    this.roundRect(ctx, centerX - sliderW / 2, currentZipY - sliderH / 2, sliderW, sliderH, 4);
    ctx.fill();
    ctx.stroke();

    // Pull tab ring
    ctx.beginPath();
    ctx.arc(centerX, currentZipY + sliderH / 2 + 5, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#AAB2BD';
    ctx.fill();
    ctx.stroke();

    // Long hanging tab handle
    ctx.fillStyle = '#CCD1D9';
    this.roundRect(ctx, centerX - 4, currentZipY + sliderH / 2 + 5, 8, 18, 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;
    const zipStartY = my + mh * 0.25;
    const zipEndY = my + mh * 0.85;
    const zipHeight = zipEndY - zipStartY;

    const currentZipY = zipStartY + this.zipValue * zipHeight;

    // Check hit on zipper slider/handle
    const dx = x - centerX;
    const dy = y - (currentZipY + 10);
    const dist = Math.hypot(dx, dy);

    if (dist <= 25) {
      this.isDragging = true;
      this.haptics.lightTap();
      return true;
    }
    return false;
  }

  public handlePointerMove(_x: number, y: number, _px: number, py: number, _pw: number, ph: number): void {
    if (!this.isDragging) return;

    const margin = 10;
    const my = py + margin;
    const mh = ph - margin * 2;

    const zipStartY = my + mh * 0.25;
    const zipEndY = my + mh * 0.85;
    const zipHeight = zipEndY - zipStartY;

    // Calculate zipValue
    let pct = (y - zipStartY) / zipHeight;
    pct = Math.max(0, Math.min(1, pct));

    if (Math.abs(pct - this.zipValue) > 0.01) {
      this.zipValue = pct;

      // Play scratching zipper ticks
      if (Math.abs(this.zipValue - this.lastTickValue) >= 0.035) {
        this.audio.play('synth:click', 350 + this.zipValue * 100);
        this.haptics.lightTap();
        this.lastTickValue = this.zipValue;
      }
    }
  }

  public handlePointerUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
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
