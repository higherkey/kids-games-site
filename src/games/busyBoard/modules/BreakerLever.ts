import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class BreakerLever extends BaseBusyBoardModule {
  private isPowerOn = true; // True = power connected (Up), False = power cut (Down)
  
  private dragProgress = 0.0; // 0 (Up/On) to 1 (Down/Off)
  private isDragging = false;
  private readonly onPowerChangedCallback?: (hasPower: boolean) => void;

  constructor(id: string, x: number, y: number, w: number, h: number, onPowerChanged?: (hasPower: boolean) => void) {
    super(id, x, y, w, h);
    this.onPowerChangedCallback = onPowerChanged;
  }

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    // Faceplate (Yellow/Black hazard stripes border or safety steel)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#E67E22'; // Orange/industrial warning plate
    ctx.strokeStyle = '#D35400';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Hazard Stripes on left and right edges
    ctx.fillStyle = '#2C3E50';
    const stripeW = 8;
    for (let sy = my + 15; sy < my + mh - 15; sy += 20) {
      // Left stripes
      ctx.beginPath();
      ctx.moveTo(mx + 4, sy);
      ctx.lineTo(mx + 4 + stripeW, sy);
      ctx.lineTo(mx + 4, sy + 10);
      ctx.closePath();
      ctx.fill();

      // Right stripes
      ctx.beginPath();
      ctx.moveTo(mx + mw - 4 - stripeW, sy);
      ctx.lineTo(mx + mw - 4, sy);
      ctx.lineTo(mx + mw - 4 - stripeW, sy + 10);
      ctx.closePath();
      ctx.fill();
    }

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('MAIN POWER BREAKER', mx + mw / 2, my + 15);
    ctx.restore();

    // The metal track slot for the handle
    const slotW = 16;
    const slotH = mh * 0.6;
    const slotX = mx + (mw - slotW) / 2;
    const slotY = my + 40;

    ctx.save();
    ctx.fillStyle = '#111111';
    ctx.fillRect(slotX, slotY, slotW, slotH);

    // Labels ON / OFF
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('ON/POWER', slotX - 15, slotY + 8);
    ctx.fillText('OFF/CUT', slotX - 15, slotY + slotH - 10);
    ctx.restore();

    // Interpolation of handle coordinates
    if (!this.isDragging) {
      const target = this.isPowerOn ? 0.0 : 1.0;
      this.dragProgress += (target - this.dragProgress) * 0.25;
    }

    // Lever Shaft pivot and rod
    const handleStartY = slotY + 10;
    const handleEndY = slotY + slotH - 10;
    const currentHandleY = handleStartY + this.dragProgress * (handleEndY - handleStartY);

    ctx.save();
    // Metal Lever Arm
    ctx.strokeStyle = '#7F8C8D';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(slotX + slotW / 2, slotY + slotH / 2); // pivot center
    ctx.lineTo(slotX + slotW / 2, currentHandleY);
    ctx.stroke();

    // Big heavy red mechanical plastic handle
    const handleW = mw * 0.5;
    const handleH = 22;
    const handleX = slotX + slotW / 2 - handleW / 2;
    const handleY = currentHandleY - handleH / 2;

    const handleGrad = ctx.createLinearGradient(handleX, handleY, handleX, handleY + handleH);
    handleGrad.addColorStop(0, '#E74C3C'); // Industrial Red
    handleGrad.addColorStop(0.5, '#C0392B');
    handleGrad.addColorStop(1, '#7F1C0D');
    
    ctx.fillStyle = handleGrad;
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, handleX, handleY, handleW, handleH, 5);
    ctx.fill();
    ctx.stroke();

    // Grip texture on handle
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let gx = handleX + 10; gx < handleX + handleW - 10; gx += 8) {
      ctx.fillRect(gx, handleY + 3, 3, handleH - 6);
    }
    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const slotW = 16;
    const slotH = mh * 0.6;
    const slotX = mx + (mw - slotW) / 2;
    const slotY = my + 40;

    const handleStartY = slotY + 10;
    const handleEndY = slotY + slotH - 10;
    const currentHandleY = handleStartY + this.dragProgress * (handleEndY - handleStartY);

    const handleW = mw * 0.5;
    const handleH = 22;
    const handleX = slotX + slotW / 2 - handleW / 2;
    const handleY = currentHandleY - handleH / 2;

    // Detect touch on the large lever handle
    if (x >= handleX - 10 && x <= handleX + handleW + 10 && y >= handleY - 10 && y <= handleY + handleH + 10) {
      this.isDragging = true;
      return true;
    }

    return false;
  }

  public handlePointerMove(_x: number, y: number, _px: number, py: number, _pw: number, ph: number): void {
    if (!this.isDragging) return;

    const margin = 10;
    const my = py + margin;
    const mh = ph - margin * 2;

    const slotH = mh * 0.6;
    const slotY = my + 40;

    const handleStartY = slotY + 10;
    const handleEndY = slotY + slotH - 10;

    // Calculate drag progress ratio (0 to 1)
    const span = handleEndY - handleStartY;
    let progress = (y - handleStartY) / span;
    progress = Math.max(0, Math.min(1.0, progress));
    
    this.dragProgress = progress;
  }

  public handlePointerUp(_x: number, _y: number, _px: number, _py: number, _pw: number, _ph: number): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    // Snap to nearest state: On (0) or Off (1)
    const newState = this.dragProgress < 0.5; // True = Up, False = Down
    
    if (newState !== this.isPowerOn) {
      this.isPowerOn = newState;
      
      // Heavy mechanical clunk sound feedback
      this.audio.play('busyboard:breaker_flip');
      this.haptics.heavyImpact();

      if (this.onPowerChangedCallback) {
        this.onPowerChangedCallback(this.isPowerOn);
      }
    }
    
    this.dragProgress = this.isPowerOn ? 0.0 : 1.0;
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
