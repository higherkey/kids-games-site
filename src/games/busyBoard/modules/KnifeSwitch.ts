import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class KnifeSwitch extends BaseBusyBoardModule {
  private isOn = false;
  private hasPower = true;
  private readonly onToggleCallback?: (state: boolean) => void;

  private isDragging = false;
  private angleProgress = 0.1; // 0 (fully open/upwards) to 1 (fully closed/downwards)
  private humTimer = 0;

  constructor(id: string, x: number, y: number, w: number, h: number, onToggle?: (state: boolean) => void) {
    super(id, x, y, w, h);
    this.onToggleCallback = onToggle;
  }

  public setPowerState(hasPower: boolean): void {
    this.hasPower = hasPower;
  }

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    // Wood Base Plate
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#5A3D28'; // Rich Mahogany Wood
    ctx.strokeStyle = '#3E2A1C';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Wood grain detail lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(mx + 15, my + (mh * i) / 5);
      ctx.lineTo(mx + mw - 15, my + (mh * i) / 5);
      ctx.stroke();
    }

    // Title
    ctx.fillStyle = '#F4F1EA'; // Light text on dark wood
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('KNIFE SWITCH', mx + mw / 2, my + 15);
    ctx.restore();

    // Key Anchor Points
    const pivotX = mx + mw / 2;
    const pivotY = my + mh * 0.3; // Hinges are near the top-middle
    const clampY = my + mh * 0.75; // Clamps are near the bottom-middle

    // Draw the contact clamps (Bottom brass brackets)
    ctx.save();
    ctx.fillStyle = '#C5A059'; // Brass color
    ctx.strokeStyle = '#8F7138';
    ctx.lineWidth = 2;
    
    // Left and right clamps
    const clampOffset = 25;
    ctx.fillRect(pivotX - clampOffset - 8, clampY - 12, 16, 24);
    ctx.strokeRect(pivotX - clampOffset - 8, clampY - 12, 16, 24);
    ctx.fillRect(pivotX + clampOffset - 8, clampY - 12, 16, 24);
    ctx.strokeRect(pivotX + clampOffset - 8, clampY - 12, 16, 24);

    // Draw the hinge brackets (Top brass brackets)
    ctx.fillRect(pivotX - clampOffset - 10, pivotY - 15, 20, 30);
    ctx.strokeRect(pivotX - clampOffset - 10, pivotY - 15, 20, 30);
    ctx.fillRect(pivotX + clampOffset - 10, pivotY - 15, 20, 30);
    ctx.strokeRect(pivotX + clampOffset - 10, pivotY - 15, 20, 30);
    ctx.restore();

    // Interpolate switch angle progress
    if (!this.isDragging) {
      const target = this.isOn ? 1.0 : 0.15;
      this.angleProgress += (target - this.angleProgress) * 0.25;
    }

    // Draw the copper blades
    // Angle math: when progress = 1, blades point down to clamps.
    // When progress = 0, blades point up/away.
    const startAngle = -Math.PI / 3; // -60 degrees (pointing up/left)
    const endAngle = Math.PI / 2;    // 90 degrees (pointing straight down)
    const currentAngle = startAngle + this.angleProgress * (endAngle - startAngle);

    const bladeLength = (clampY - pivotY) * 1.1;
    const leftBladeEndX = pivotX - clampOffset + Math.cos(currentAngle) * bladeLength;
    const leftBladeEndY = pivotY + Math.sin(currentAngle) * bladeLength;
    const rightBladeEndX = pivotX + clampOffset + Math.cos(currentAngle) * bladeLength;
    const rightBladeEndY = pivotY + Math.sin(currentAngle) * bladeLength;

    ctx.save();
    ctx.strokeStyle = '#D96E43'; // Copper Red/Orange
    ctx.lineWidth = 8;
    ctx.lineCap = 'butt';
    
    // Draw left blade
    ctx.beginPath();
    ctx.moveTo(pivotX - clampOffset, pivotY);
    ctx.lineTo(leftBladeEndX, leftBladeEndY);
    ctx.stroke();

    // Draw right blade
    ctx.beginPath();
    ctx.moveTo(pivotX + clampOffset, pivotY);
    ctx.lineTo(rightBladeEndX, rightBladeEndY);
    ctx.stroke();

    // Draw connecting handle bar (drawn between blade ends)
    ctx.strokeStyle = '#222222'; // Heavy black insulated handle
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(leftBladeEndX - 10, leftBladeEndY);
    ctx.lineTo(rightBladeEndX + 10, rightBladeEndY);
    ctx.stroke();
    
    // Handle handle-knob in the center
    const handleMidX = (leftBladeEndX + rightBladeEndX) / 2;
    const handleMidY = (leftBladeEndY + rightBladeEndY) / 2;
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(handleMidX, handleMidY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw electrical sparks if closed AND has power
    if (this.isOn && this.hasPower && this.angleProgress > 0.95) {
      this.drawElectricArc(ctx, pivotX - clampOffset, clampY, leftBladeEndX, leftBladeEndY);
      this.drawElectricArc(ctx, pivotX + clampOffset, clampY, rightBladeEndX, rightBladeEndY);
      
      // Periodic soft drone hum effect
      this.humTimer++;
      if (this.humTimer % 10 === 0) {
        this.haptics.lightTap();
        this.audio.play('synth:pluck', 55); // Ultra low hum tone
      }
    }
  }

  private drawElectricArc(ctx: CanvasRenderingContext2D, sx: number, sy: number, ex: number, ey: number) {
    ctx.save();
    ctx.strokeStyle = '#4ECDC4'; // Cyan electricity
    ctx.lineWidth = 2 + Math.random() * 3;
    ctx.shadowColor = '#4ECDC4';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    
    const steps = 4;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = sx + (ex - sx) * t + (Math.random() - 0.5) * 15;
      const y = sy + (ey - sy) * t + (Math.random() - 0.5) * 15;
      ctx.lineTo(x, y);
    }
    
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const pivotX = mx + mw / 2;
    const pivotY = my + mh * 0.3;
    const clampY = my + mh * 0.75;

    // Calculate current handle position
    const startAngle = -Math.PI / 3;
    const endAngle = Math.PI / 2;
    const currentAngle = startAngle + this.angleProgress * (endAngle - startAngle);
    const bladeLength = (clampY - pivotY) * 1.1;

    const leftBladeEndX = pivotX - 25 + Math.cos(currentAngle) * bladeLength;
    const leftBladeEndY = pivotY + Math.sin(currentAngle) * bladeLength;
    const rightBladeEndX = pivotX + 25 + Math.cos(currentAngle) * bladeLength;
    const rightBladeEndY = pivotY + Math.sin(currentAngle) * bladeLength;
    
    const handleMidX = (leftBladeEndX + rightBladeEndX) / 2;
    const handleMidY = (leftBladeEndY + rightBladeEndY) / 2;

    // Hit-test against handle bar center
    const dist = Math.hypot((x - handleMidX), (y - handleMidY));
    if (dist < 35) {
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
    
    const pivotY = my + mh * 0.3;
    const clampY = my + mh * 0.75;

    // Map drag coordinate between pivotY and clampY to progress
    const dragSpan = clampY - pivotY;
    let progress = (y - pivotY) / dragSpan;
    progress = Math.max(0, Math.min(1.0, progress));
    
    this.angleProgress = progress;
  }

  public handlePointerUp(_x: number, _y: number, _px: number, _py: number, _pw: number, _ph: number): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    // Close threshold at 80% progress
    const newState = this.angleProgress > 0.8;
    if (newState !== this.isOn) {
      this.isOn = newState;
      
      // Feedback
      if (this.isOn) {
        this.audio.play('busyboard:knife_close');
        this.haptics.heavyImpact();
      } else {
        this.audio.play('busyboard:knife_open');
        this.haptics.lightTap();
      }

      if (this.onToggleCallback) {
        this.onToggleCallback(this.isOn);
      }
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
