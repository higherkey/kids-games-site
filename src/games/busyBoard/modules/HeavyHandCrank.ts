import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class HeavyHandCrank extends BaseBusyBoardModule {
  private isDragging = false;
  private crankAngle = 0;
  private powerLevel = 0; // 0.0 to 1.0
  private lastTouchAngle = 0;
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

    const centerX = mx + mw * 0.4; // shift left to leave space for power bar
    const centerY = my + mh / 2 + 10;

    // Faceplate - Dark industrial steel grid
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;

    const faceGrad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
    faceGrad.addColorStop(0, '#3A3D40');
    faceGrad.addColorStop(1, '#1A1D20');
    ctx.fillStyle = faceGrad;

    ctx.strokeStyle = '#5E6672';
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
    ctx.fillStyle = '#E6E9ED';
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('HAND CRANK GENERATOR', mx + mw / 2, my + 15);
    ctx.restore();

    // Power decay logic
    this.updatePowerDecay();

    // --- DRAW VERTICAL POWER BAR (Right column) ---
    ctx.save();
    const barX = mx + mw * 0.8;
    const barY = my + mh * 0.35;
    const barW = 12;
    const barH = mh * 0.55;

    // Drawing outer glass tube
    ctx.fillStyle = '#1D212A';
    ctx.strokeStyle = '#434A54';
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, barX - barW / 2, barY, barW, barH, 6);
    ctx.fill();
    ctx.stroke();

    // Fill glowing red mercury based on powerLevel
    if (this.powerLevel > 0.02) {
      ctx.fillStyle = '#E9573F'; // hot red/orange glow
      ctx.shadowColor = '#E9573F';
      ctx.shadowBlur = 8;
      
      const fillH = this.powerLevel * barH;
      this.roundRect(ctx, barX - barW / 2 + 1, barY + barH - fillH, barW - 2, fillH, 5);
      ctx.fill();
    }
    ctx.restore();

    // --- DRAW CRANK ASSEMBLY ---
    ctx.save();
    ctx.translate(centerX, centerY);

    // Crank base hub circle
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#4E5661';
    ctx.strokeStyle = '#373E47';
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    // Rotate the crank arm
    ctx.rotate(this.crankAngle);

    // Metallic crank arm
    const armW = 40;
    const armH = 10;
    ctx.fillStyle = '#AAB2BD';
    ctx.strokeStyle = '#434A54';
    ctx.lineWidth = 2;
    this.roundRect(ctx, 0, -armH / 2, armW, armH, 3);
    ctx.fill();
    ctx.stroke();

    // Rotate relative center knob handle
    ctx.beginPath();
    ctx.arc(armW - 3, 0, 9, 0, Math.PI * 2);
    const knobGrad = ctx.createRadialGradient(armW - 3, 0, 2, armW - 3, 0, 9);
    knobGrad.addColorStop(0, '#DA4453'); // bright ruby handle
    knobGrad.addColorStop(1, '#962D37');
    ctx.fillStyle = knobGrad;
    ctx.strokeStyle = '#682129';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private updatePowerDecay() {
    // Slow decay down to zero
    this.powerLevel -= 0.003;
    this.powerLevel = Math.max(0, this.powerLevel);
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw * 0.4;
    const centerY = my + mh / 2 + 10;
    const armLength = 40;

    // Check hit on crank arm tip
    const armTipX = centerX + Math.cos(this.crankAngle) * armLength;
    const armTipY = centerY + Math.sin(this.crankAngle) * armLength;

    const dx = x - armTipX;
    const dy = y - armTipY;
    const dist = Math.hypot(dx, dy);

    if (dist <= 25) {
      this.isDragging = true;
      this.lastTouchAngle = Math.atan2(y - centerY, x - centerX);
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

    const centerX = mx + mw * 0.4;
    const centerY = my + mh / 2 + 10;

    const currentTouchAngle = Math.atan2(y - centerY, x - centerX);
    let delta = currentTouchAngle - this.lastTouchAngle;

    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    this.lastTouchAngle = currentTouchAngle;

    // Update rotation
    this.crankAngle += delta;

    // Build power level based on rotation speed/delta magnitude
    const magnitude = Math.abs(delta);
    this.powerLevel += magnitude * 0.08;
    this.powerLevel = Math.min(1.0, this.powerLevel);

    // Play click ticks
    if (Math.abs(this.crankAngle - this.lastTickAngle) >= 0.25) {
      const clickPitch = 120 + this.powerLevel * 480;
      this.audio.play('synth:click', clickPitch);
      this.haptics.lightTap();
      this.lastTickAngle = this.crankAngle;
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
