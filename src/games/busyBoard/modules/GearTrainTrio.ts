import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class GearTrainTrio extends BaseBusyBoardModule {
  private angle1 = 0; // base angle for Gear 1
  private readonly teeth1 = 12;
  private readonly teeth2 = 8;
  private readonly teeth3 = 10;

  private draggingGear: number | null = null;
  private prevDragAngle = 0;
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

    // Faceplate Background - Brushed metallic steel look
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;

    const faceGrad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
    faceGrad.addColorStop(0, '#5C616A');
    faceGrad.addColorStop(0.5, '#42464D');
    faceGrad.addColorStop(1, '#2F3136');
    ctx.fillStyle = faceGrad;

    ctx.strokeStyle = '#757C8A';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Subtle brushed metal stripes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < mw; i += 8) {
      ctx.beginPath();
      ctx.moveTo(mx + i, my);
      ctx.lineTo(mx + i, my + mh);
      ctx.stroke();
    }

    // Corner rivets (screws)
    const rivetRadius = 4;
    const rivetOffset = 10;
    ctx.fillStyle = '#9AA0AC';
    ctx.strokeStyle = '#42464D';
    ctx.lineWidth = 1;
    const corners = [
      [mx + rivetOffset, my + rivetOffset],
      [mx + mw - rivetOffset, my + rivetOffset],
      [mx + rivetOffset, my + mh - rivetOffset],
      [mx + mw - rivetOffset, my + mh - rivetOffset],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, rivetRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Screw slot line
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy - 2);
      ctx.lineTo(cx + 2, cy + 2);
      ctx.strokeStyle = '#42464D';
      ctx.stroke();
    });

    // Draw Title
    ctx.fillStyle = '#E3E6EB';
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('GEAR TRAIN TRIO', mx + mw / 2, my + 15);
    ctx.restore();

    // Gear center definitions (relative to panel coordinates)
    const centers = this.getGearCenters(mx, my, mw, mh);
    const r1 = 38;
    const r2 = 28;
    const r3 = 33;

    // Intermeshing gear angles (needs offset so teeth align)
    const a1 = this.angle1;
    // Gear 2 is driven by Gear 1
    const a2 = -a1 * (this.teeth1 / this.teeth2) + Math.PI / this.teeth2;
    // Gear 3 is driven by Gear 1
    const a3 = -a1 * (this.teeth1 / this.teeth3) + Math.PI / this.teeth3;

    // Draw connection slots/lines between axes for mechanics
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centers[0].x, centers[0].y);
    ctx.lineTo(centers[1].x, centers[1].y);
    ctx.lineTo(centers[2].x, centers[2].y);
    ctx.closePath();
    ctx.stroke();

    // Render gears
    this.drawGear(ctx, centers[0], r1, this.teeth1, a1, '#D4AF37', '#B8860B'); // Gold/Brass
    this.drawGear(ctx, centers[1], r2, this.teeth2, a2, '#B87333', '#8B4513'); // Copper
    this.drawGear(ctx, centers[2], r3, this.teeth3, a3, '#C0C0C0', '#808080'); // Silver/Chrome
  }

  private getGearCenters(mx: number, my: number, mw: number, mh: number) {
    const cx = mx + mw / 2;
    const cy = my + mh / 2 + 10;
    return [
      { x: cx - 28, y: cy - 18 }, // Large
      { x: cx + 32, y: cy - 25 }, // Small
      { x: cx - 2, y: cy + 30 },   // Medium
    ];
  }

  private drawGear(
    ctx: CanvasRenderingContext2D,
    center: { x: number; y: number },
    r: number,
    teeth: number,
    angle: number,
    color: string,
    strokeColor: string
  ) {
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);

    // Gear body
    ctx.fillStyle = color;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    const innerR = r - 6;
    const outerR = r + 4;

    for (let i = 0; i < teeth; i++) {
      const step = (Math.PI * 2) / teeth;
      const theta = i * step;

      // Outer teeth vertices
      ctx.lineTo(Math.cos(theta) * innerR, Math.sin(theta) * innerR);
      ctx.lineTo(Math.cos(theta + step * 0.25) * outerR, Math.sin(theta + step * 0.25) * outerR);
      ctx.lineTo(Math.cos(theta + step * 0.5) * outerR, Math.sin(theta + step * 0.5) * outerR);
      ctx.lineTo(Math.cos(theta + step * 0.75) * innerR, Math.sin(theta + step * 0.75) * innerR);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cutouts for aesthetic gear spokes
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(0, 0, innerR - 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw Spokes
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos((i * Math.PI) / 2) * innerR, Math.sin((i * Math.PI) / 2) * innerR);
      ctx.stroke();
    }

    // Center pin
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
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

    const centers = this.getGearCenters(mx, my, mw, mh);
    const radii = [38, 28, 33];

    for (let i = 0; i < 3; i++) {
      const dist = Math.hypot(x - centers[i].x, y - centers[i].y);
      if (dist <= radii[i] + 10) {
        this.draggingGear = i;
        this.prevDragAngle = Math.atan2(y - centers[i].y, x - centers[i].x);
        return true;
      }
    }

    return false;
  }

  public handlePointerMove(x: number, y: number, px: number, py: number, pw: number, ph: number): void {
    if (this.draggingGear === null) return;

    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centers = this.getGearCenters(mx, my, mw, mh);
    const center = centers[this.draggingGear];

    const currentAngle = Math.atan2(y - center.y, x - center.x);
    let delta = currentAngle - this.prevDragAngle;

    // Handle wrap-around
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    // Apply rotation based on which gear is dragged
    if (this.draggingGear === 0) {
      this.angle1 += delta;
    } else if (this.draggingGear === 1) {
      this.angle1 -= delta * (this.teeth2 / this.teeth1);
    } else {
      this.angle1 -= delta * (this.teeth3 / this.teeth1);
    }

    this.prevDragAngle = currentAngle;

    // Tick sounds and haptic vibrations
    const tickDistance = (Math.PI * 2) / (this.teeth1 * 2); // twice per tooth
    if (Math.abs(this.angle1 - this.lastTickAngle) >= tickDistance) {
      const direction = this.angle1 > this.lastTickAngle ? 1 : -1;
      this.lastTickAngle = this.angle1;
      
      this.audio.play('synth:click', 180 + direction * 20);
      this.haptics.lightTap();
    }
  }

  public handlePointerUp(): void {
    this.draggingGear = null;
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
