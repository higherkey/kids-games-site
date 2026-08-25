import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class ThreadedScrew extends BaseBusyBoardModule {
  private isDragging = false;
  private screwAngle = 0; // rotation angle
  private lastTouchAngle = 0;
  private depth = 0; // 0.0 (flush/unscrewed) to 1.0 (tight/screwed in)
  private readonly maxDepth = 1.0;
  private lastTickAngle = 0;

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
    const centerY = my + mh / 2 + 10;

    // Faceplate - Weathered green brass look
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;

    const faceGrad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
    faceGrad.addColorStop(0, '#506A63'); // weathered green copper
    faceGrad.addColorStop(1, '#2E3F3B');
    ctx.fillStyle = faceGrad;

    ctx.strokeStyle = '#68857C';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Rivets
    ctx.fillStyle = '#89AFA4';
    ctx.beginPath();
    ctx.arc(mx + 15, my + 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + mw - 15, my + 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + 15, my + mh - 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + mw - 15, my + mh - 15, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Title
    ctx.fillStyle = '#D6EBE5';
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('THREADED SCREW', centerX, my + 15);
    ctx.restore();

    // --- DRAW THREADED HOLE / THREADS ---
    ctx.save();
    // Inner socket thread rings (they fade as screw goes down)
    const holeR = 25;
    ctx.fillStyle = '#1D212A';
    ctx.strokeStyle = '#3E4647';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, holeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Thread rings inside hole
    ctx.strokeStyle = '#4A505A';
    ctx.lineWidth = 1.5;
    for (let r = holeR - 4; r > 5; r -= 4) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // --- DRAW SCREW HEAD ---
    // Screw size shrinks slightly and gets shadows closer as it drives in
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.screwAngle);

    const screwR = 24 - this.depth * 3; // shrinks slightly to show depth
    
    // Screw head shadows (decreases as it goes down)
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = Math.max(1, 6 - this.depth * 5);
    ctx.shadowOffsetY = Math.max(0.5, 3 - this.depth * 2.5);

    // Copper head surface
    const headGrad = ctx.createLinearGradient(-screwR, -screwR, screwR, screwR);
    headGrad.addColorStop(0, '#E5A93C');
    headGrad.addColorStop(1, '#966D20');
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#B38B38';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, screwR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Screw center flathead slot
    ctx.fillStyle = '#4E3F29';
    ctx.fillRect(-screwR * 0.75, -3.5, screwR * 1.5, 7);

    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;
    const centerY = my + mh / 2 + 10;
    const screwR = 24;

    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist <= screwR + 15) {
      this.isDragging = true;
      this.lastTouchAngle = Math.atan2(dy, dx);
      this.haptics.lightTap();
      return true;
    }
    return false;
  }

  public handlePointerMove(x: number, y: number, px: number, py: number, pw: number, ph: number): void {
    if (!this.isDragging) return;

    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;
    const centerY = my + mh / 2 + 10;

    const currentTouchAngle = Math.atan2(y - centerY, x - centerX);
    let delta = currentTouchAngle - this.lastTouchAngle;

    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    this.lastTouchAngle = currentTouchAngle;

    this.screwAngle += delta;

    // Drive depth based on rotation delta:
    // Clockwise (positive delta) drives screw down
    // Counter-clockwise (negative delta) unscrews it
    const lastIntDepth = Math.round(this.depth * 10);
    this.depth += delta * 0.04;
    this.depth = Math.max(0, Math.min(this.maxDepth, this.depth));

    // Play metal clicks on rotation depth ticks
    if (Math.abs(this.screwAngle - this.lastTickAngle) >= 0.35) {
      const clickPitch = 150 + this.depth * 350;
      this.audio.play('synth:click', clickPitch);
      this.haptics.lightTap();
      this.lastTickAngle = this.screwAngle;
    }

    // Solved bottom lock sound
    if (this.depth === this.maxDepth && lastIntDepth !== 10) {
      this.audio.play('busyboard:push_button');
      this.haptics.vibrate(75);
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
