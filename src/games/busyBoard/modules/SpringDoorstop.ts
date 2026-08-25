import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class SpringDoorstop extends BaseBusyBoardModule {
  private isDragging = false;
  private tipX = 0;
  private tipY = 0;
  
  // Wobble oscillation parameters
  private isWobbling = false;
  private wobbleTimer = 0;
  private readonly wobbleAngle = 0;
  private wobbleAmpX = 0;
  private wobbleAmpY = 0;
  private setupDone = false;

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
    const baseY = my + mh * 0.35; // base anchor is higher up
    const defaultTipY = my + mh * 0.75;

    if (!this.setupDone) {
      this.tipX = centerX;
      this.tipY = defaultTipY;
      this.setupDone = true;
    }

    // Faceplate - Industrial dark metal
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;

    const faceGrad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
    faceGrad.addColorStop(0, '#434A54');
    faceGrad.addColorStop(1, '#252B33');
    ctx.fillStyle = faceGrad;

    ctx.strokeStyle = '#5E6672';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Rivets
    ctx.fillStyle = '#AAB2BD';
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
    ctx.fillText('SPRING DOORSTOP', centerX, my + 15);
    ctx.restore();

    // Update wobble physics
    this.updateWobble(centerX, defaultTipY);

    // --- DRAW COIL SPRING ---
    ctx.save();
    // 1. Draw spring base plate
    ctx.fillStyle = '#656D78';
    ctx.strokeStyle = '#434A54';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(centerX, baseY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(centerX, baseY, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#4E5661';
    ctx.fill();

    // 2. Draw coil lines (sinusoidal curves from base to current tip)
    ctx.strokeStyle = '#CCD1D9';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    const numCoils = 14;
    const stepX = (this.tipX - centerX) / numCoils;
    const stepY = (this.tipY - baseY) / numCoils;
    
    ctx.beginPath();
    ctx.moveTo(centerX, baseY);

    for (let i = 0; i <= numCoils; i++) {
      const cx = centerX + i * stepX;
      const cy = baseY + i * stepY;
      // Zigzag width alternates
      const coilOffset = (i % 2 === 0 ? 1 : -1) * 12 * (1 - i / numCoils * 0.3); // tapers slightly toward tip
      
      // Draw curve perpendicular to the spring direction
      const angle = Math.atan2(this.tipY - baseY, this.tipX - centerX) + Math.PI / 2;
      const ox = cx + Math.cos(angle) * coilOffset;
      const oy = cy + Math.sin(angle) * coilOffset;
      
      ctx.lineTo(ox, oy);
    }
    // Connect to actual tip
    ctx.lineTo(this.tipX, this.tipY);
    ctx.stroke();

    // 3. Draw plastic/rubber tip bumper cap
    ctx.beginPath();
    ctx.arc(this.tipX, this.tipY, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#DA4453'; // red rubber cap
    ctx.strokeStyle = '#8E2833';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private updateWobble(cx: number, cy: number) {
    if (!this.isWobbling) return;

    this.wobbleTimer += 0.45; // Speed of wobble oscillation
    
    // Decay amplitude over time
    const decay = Math.exp(-0.06 * this.wobbleTimer);
    
    if (decay < 0.05) {
      this.isWobbling = false;
      this.tipX = cx;
      this.tipY = cy;
      return;
    }

    // Oscillating wobble
    this.tipX = cx + Math.sin(this.wobbleTimer * 1.5) * this.wobbleAmpX * decay;
    this.tipY = cy + Math.cos(this.wobbleTimer * 1.8) * this.wobbleAmpY * decay;

    // Trigger vibration/sounds inside wobble
    if (Math.random() < 0.25) {
      const pitch = 220 + decay * 500;
      this.audio.play('synth:pluck', pitch);
      this.haptics.lightTap();
    }
  }

  public handlePointerDown(x: number, y: number, _px: number, _py: number, _pw: number, _ph: number): boolean {
    // Check click distance to spring tip
    const dx = x - this.tipX;
    const dy = y - this.tipY;
    const dist = Math.hypot(dx, dy);

    if (dist <= 25) {
      this.isDragging = true;
      this.isWobbling = false;
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
    const baseY = my + mh * 0.35;

    // Drag spring tip, restrict stretch radius (max 65px from base)
    const dx = x - centerX;
    const dy = y - baseY;
    const dist = Math.hypot(dx, dy);
    const maxStretch = 65;

    if (dist > maxStretch) {
      this.tipX = centerX + (dx / dist) * maxStretch;
      this.tipY = baseY + (dy / dist) * maxStretch;
    } else {
      this.tipX = x;
      this.tipY = y;
    }

    if (Math.random() < 0.15) {
      this.audio.play('synth:pluck', 120);
      this.haptics.lightTap();
    }
  }

  public handlePointerUp(_x: number, _y: number, px: number, py: number, pw: number, ph: number): void {
    if (this.isDragging) {
      this.isDragging = false;

      const margin = 10;
      const mx = px + margin;
      const my = py + margin;
      const mw = pw - margin * 2;
      const mh = ph - margin * 2;

      const centerX = mx + mw / 2;
      const defaultTipY = my + mh * 0.75;

      // Calculate release distance (spring tension)
      const dx = this.tipX - centerX;
      const dy = this.tipY - defaultTipY;
      const tension = Math.hypot(dx, dy);

      if (tension > 10) {
        this.isWobbling = true;
        this.wobbleTimer = 0;
        this.wobbleAmpX = dx * 1.5;
        this.wobbleAmpY = dy * 1.5;
        
        // Play rapid boing/spring sweeps
        this.audio.play('synth:pluck', 380);
        this.audio.play('synth:pluck', 550);
        this.haptics.vibrate(75);
      } else {
        this.tipX = centerX;
        this.tipY = defaultTipY;
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
