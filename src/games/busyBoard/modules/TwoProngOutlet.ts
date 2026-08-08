import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class TwoProngOutlet extends BaseBusyBoardModule {
  private isPluggedIn = false;
  private isDragging = false;
  private plugX = 0;
  private plugY = 0;
  private initialSetupDone = false;
  private batteryCharge = 0.1;
  private lastTime = 0;

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
    const outletY = my + mh * 0.35;

    // Initialize positions once layout is known
    if (!this.initialSetupDone) {
      this.plugX = centerX;
      this.plugY = my + mh * 0.75;
      this.initialSetupDone = true;
    }

    // Faceplate Background
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;

    const faceGrad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
    faceGrad.addColorStop(0, '#434A54');
    faceGrad.addColorStop(1, '#2E353F');
    ctx.fillStyle = faceGrad;

    ctx.strokeStyle = '#656D78';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Rivets
    ctx.fillStyle = '#CCD1D9';
    ctx.beginPath();
    ctx.arc(mx + 15, my + 15, 3, 0, Math.PI * 2);
    ctx.arc(mx + mw - 15, my + 15, 3, 0, Math.PI * 2);
    ctx.arc(mx + 15, my + mh - 15, 3, 0, Math.PI * 2);
    ctx.arc(mx + mw - 15, my + mh - 15, 3, 0, Math.PI * 2);
    ctx.fill();

    // Title
    ctx.fillStyle = '#E6E9ED';
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('TWO-PRONG OUTLET', centerX, my + 15);
    ctx.restore();

    // --- UPDATE BATTERY CHARGE ---
    const now = performance.now();
    const dt = this.lastTime === 0 ? 0 : (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (this.isPluggedIn) {
      // Charge battery from 0.1 to 1.0 in ~6 seconds
      this.batteryCharge = Math.min(1.0, this.batteryCharge + dt * 0.15);
    } else {
      // Discharge when unplugged
      this.batteryCharge = 0.1;
    }

    // --- DRAW BATTERY GAUGE ---
    const batW = 40;
    const batH = 20;
    const batX = mx + mw - batW - 20;
    const batY = my + 12;

    ctx.save();
    // Battery Outer Outline
    ctx.strokeStyle = '#CCD1D9';
    ctx.lineWidth = 2;
    this.roundRect(ctx, batX, batY, batW, batH, 4);
    ctx.stroke();

    // Battery Cap
    ctx.fillStyle = '#CCD1D9';
    ctx.fillRect(batX + batW, batY + batH / 2 - 4, 3, 8);

    // Charge level fill
    let fillStyle = '#E74C3C'; // Red for low charge
    if (this.batteryCharge > 0.5) fillStyle = '#2ECC71'; // Green
    else if (this.batteryCharge > 0.2) fillStyle = '#F1C40F'; // Yellow

    ctx.fillStyle = fillStyle;
    const padding = 2;
    const maxFillWidth = batW - padding * 2;
    const fillWidth = maxFillWidth * this.batteryCharge;
    if (fillWidth > 0) {
      ctx.fillRect(batX + padding, batY + padding, fillWidth, batH - padding * 2);
    }

    // Lightning bolt charging icon
    if (this.isPluggedIn) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(batX + batW / 2 + 2, batY + 3);
      ctx.lineTo(batX + batW / 2 - 4, batY + batH / 2 + 1);
      ctx.lineTo(batX + batW / 2 + 1, batY + batH / 2 + 1);
      ctx.lineTo(batX + batW / 2 - 2, batY + batH - 3);
      ctx.lineTo(batX + batW / 2 + 4, batY + batH / 2 - 1);
      ctx.lineTo(batX + batW / 2 - 1, batY + batH / 2 - 1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // --- DRAW OUTLET ---
    ctx.save();
    // Outlet socket plastic cover
    ctx.fillStyle = '#1D212A';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 3;
    this.roundRect(ctx, centerX - 32, outletY - 32, 64, 64, 12);
    ctx.fill();
    ctx.stroke();

    // Screw in middle of outlet
    ctx.fillStyle = '#7F8C8D';
    ctx.beginPath();
    ctx.arc(centerX, outletY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw standard two-prong slots
    const slotW = 5;
    const slotH = 15;
    const slotOffset = 14;

    ctx.fillStyle = '#08090C';
    // Left slot (taller neutral)
    this.roundRect(ctx, centerX - slotOffset - slotW / 2, outletY - slotH / 2, slotW, slotH, 1);
    // Right slot (shorter hot)
    this.roundRect(ctx, centerX + slotOffset - slotW / 2, outletY - (slotH - 4) / 2, slotW, slotH - 4, 1);
    ctx.fill();

    // Outlet power LED indicator
    ctx.beginPath();
    ctx.arc(centerX, outletY - 22, 4, 0, Math.PI * 2);
    if (this.isPluggedIn) {
      ctx.fillStyle = '#2ECC71'; // Green glowing
      ctx.shadowColor = '#2ECC71';
      ctx.shadowBlur = 8;
    } else {
      ctx.fillStyle = '#E74C3C'; // Red off
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // --- PHYSICS & CORD DRAWING ---
    const cordStartX = centerX;
    const cordStartY = my + mh - 5;
    const currentPlugX = this.isPluggedIn ? centerX : this.plugX;
    const currentPlugY = this.isPluggedIn ? outletY + 5 : this.plugY;

    // Draw rubber cord line using Bezier Curve
    ctx.save();
    ctx.strokeStyle = '#11141A';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cordStartX, cordStartY);
    // Control points for a natural hanging curve
    const midY = Math.max(cordStartY, currentPlugY) + 30;
    ctx.bezierCurveTo(cordStartX, midY, currentPlugX, midY, currentPlugX, currentPlugY);
    ctx.stroke();
    ctx.restore();

    // --- DRAW PLUG ---
    if (!this.isPluggedIn) {
      ctx.save();
      // Drop shadow for the plug
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 3;

      // Draw the plug body
      ctx.fillStyle = '#656D78';
      ctx.strokeStyle = '#434A54';
      ctx.lineWidth = 2;
      const plugW = 34;
      const plugH = 22;
      this.roundRect(ctx, currentPlugX - plugW / 2, currentPlugY - plugH / 2, plugW, plugH, 6);
      ctx.fill();
      ctx.stroke();
      ctx.shadowColor = 'transparent';

      // Rubber strain relief boot
      ctx.fillStyle = '#1D212A';
      ctx.fillRect(currentPlugX - 5, currentPlugY + plugH / 2 - 2, 10, 8);

      // Draw two metal prongs extending upwards
      ctx.fillStyle = '#F39C12'; // Brass color
      ctx.fillRect(currentPlugX - slotOffset - 2, currentPlugY - plugH / 2 - 8, 4, 8);
      ctx.fillRect(currentPlugX + slotOffset - 2, currentPlugY - plugH / 2 - 8, 4, 8);

      ctx.restore();
    } else {
      // Plug is inserted! Draw it overlapping the outlet
      ctx.save();
      ctx.fillStyle = '#3E444F';
      ctx.strokeStyle = '#22262F';
      ctx.lineWidth = 2;
      const plugW = 34;
      const plugH = 14;
      // Slightly flatter inserted view
      this.roundRect(ctx, currentPlugX - plugW / 2, currentPlugY - 4, plugW, plugH, 4);
      ctx.fill();
      ctx.stroke();

      // Strain relief boot
      ctx.fillStyle = '#1D212A';
      ctx.fillRect(currentPlugX - 5, currentPlugY + plugH - 4, 10, 8);
      ctx.restore();
    }
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;
    const outletY = my + mh * 0.35;
    const currentPlugX = this.isPluggedIn ? centerX : this.plugX;
    const currentPlugY = this.isPluggedIn ? outletY + 5 : this.plugY;

    // Detect click on the plug body
    const dist = Math.hypot(x - currentPlugX, y - currentPlugY);
    if (dist <= 25) {
      if (this.isPluggedIn) {
        // Unplug it!
        this.isPluggedIn = false;
        this.plugX = x;
        this.plugY = y;
        this.audio.play('synth:click', 400); // Unplug click
        this.haptics.lightTap();
      }
      this.isDragging = true;
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

    // Constrain plug drag area within module bounds roughly
    this.plugX = Math.max(mx + 15, Math.min(mx + mw - 15, x));
    this.plugY = Math.max(my + 15, Math.min(my + mh - 15, y));

    // Check snapping to outlet
    const centerX = mx + mw / 2;
    const outletY = my + mh * 0.35;
    const distToOutlet = Math.hypot(this.plugX - centerX, this.plugY - (outletY + 5));

    if (distToOutlet < 25) {
      this.isPluggedIn = true;
      this.isDragging = false;
      this.audio.play('synth:bell', 600); // Snap sound!
      this.haptics.success();
    }
  }

  public handlePointerUp(): void {
    this.isDragging = false;
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
