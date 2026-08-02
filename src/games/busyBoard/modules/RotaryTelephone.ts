import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class RotaryTelephone extends BaseBusyBoardModule {
  private isDragging = false;
  private currentAngle = 0; // rotation angle in radians
  private dragStartAngle = 0;
  private initialTouchAngle = 0;

  // Spring return parameters
  private isReturning = false;
  private readonly returnSpeed = 0.08;
  
  // Stop bracket angle (approx 140 degrees / 2.44 rad)
  private readonly stopAngle = 2.44; 

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
    const rotorRadius = Math.min(mw, mh) * 0.32;

    // Faceplate - Retro telephone cream/beige look
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;

    const faceGrad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
    faceGrad.addColorStop(0, '#E6DCC4');
    faceGrad.addColorStop(1, '#C7B99D');
    ctx.fillStyle = faceGrad;

    ctx.strokeStyle = '#AD9F85';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Corner rivets
    ctx.fillStyle = '#C7B99D';
    ctx.beginPath();
    ctx.arc(mx + 15, my + 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + mw - 15, my + 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + 15, my + mh - 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + mw - 15, my + mh - 15, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Title
    ctx.fillStyle = '#6E6148';
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('ROTARY DIALER', centerX, my + 15);
    ctx.restore();

    // Update spring return
    this.updateSpringReturn();

    // --- DRAW DIAL BACKGROUND NUMBERS ---
    ctx.save();
    ctx.fillStyle = '#FAF6EE';
    ctx.beginPath();
    ctx.arc(centerX, centerY, rotorRadius - 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw static numbers (0-9) inside holes circles
    ctx.fillStyle = '#4E3F29';
    ctx.font = 'bold 15px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 10 holes, starting at top-right (approx -Math.PI / 3) and going clockwise
    const numHoles = 10;
    const startOffsetAngle = -Math.PI / 2.5;
    const holeSpread = Math.PI * 1.4; // spread across 250 degrees

    for (let i = 0; i < numHoles; i++) {
      const angle = startOffsetAngle + (i / numHoles) * holeSpread;
      const numX = centerX + Math.cos(angle) * (rotorRadius * 0.72);
      const numY = centerY + Math.sin(angle) * (rotorRadius * 0.72);

      // Numbers are 1 to 9, then 0 at the end
      const label = i === 9 ? '0' : String(i + 1);
      ctx.fillText(label, numX, numY);
    }
    ctx.restore();

    // --- DRAW ROTOR WHEEL ---
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.currentAngle);

    // Main wheel plate (semi-transparent clear plastic look)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, rotorRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw the 10 finger holes
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < numHoles; i++) {
      const angle = startOffsetAngle + (i / numHoles) * holeSpread;
      const holeX = Math.cos(angle) * (rotorRadius * 0.72);
      const holeY = Math.sin(angle) * (rotorRadius * 0.72);
      ctx.beginPath();
      ctx.arc(holeX, holeY, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Draw metal chrome borders for finger holes (after Composite mode reset)
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.currentAngle);
    ctx.strokeStyle = '#ADAEB3';
    ctx.lineWidth = 2;
    for (let i = 0; i < numHoles; i++) {
      const angle = startOffsetAngle + (i / numHoles) * holeSpread;
      const holeX = Math.cos(angle) * (rotorRadius * 0.72);
      const holeY = Math.sin(angle) * (rotorRadius * 0.72);
      ctx.beginPath();
      ctx.arc(holeX, holeY, 11.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Center chrome cap
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    const chromeGrad = ctx.createLinearGradient(-12, -12, 12, 12);
    chromeGrad.addColorStop(0, '#FFFFFF');
    chromeGrad.addColorStop(0.5, '#AAB2BD');
    chromeGrad.addColorStop(1, '#434A54');
    ctx.fillStyle = chromeGrad;
    ctx.strokeStyle = '#4E5661';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // --- DRAW DIAL STOP BRACKET ---
    // Fixed metal bracket near stopAngle (bottom right)
    ctx.save();
    const stopOffset = startOffsetAngle + holeSpread + 0.15; // slightly after last hole
    const stopX = centerX + Math.cos(stopOffset) * (rotorRadius * 0.72);
    const stopY = centerY + Math.sin(stopOffset) * (rotorRadius * 0.72);

    ctx.fillStyle = '#ADAEB3';
    ctx.strokeStyle = '#434A54';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Tiny wedge bracket
    ctx.moveTo(stopX - 5, stopY - 5);
    ctx.lineTo(stopX + 8, stopY + 8);
    ctx.lineTo(stopX - 3, stopY + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private updateSpringReturn() {
    if (!this.isReturning) return;

    this.currentAngle -= this.returnSpeed;

    // Tick sound as it returns
    if (Math.abs(this.currentAngle - this.lastTickAngle) >= 0.12) {
      this.audio.play('synth:click', 450);
      this.haptics.lightTap();
      this.lastTickAngle = this.currentAngle;
    }

    if (this.currentAngle <= 0) {
      this.currentAngle = 0;
      this.isReturning = false;
      // Ding bell at rest
      this.audio.play('synth:bell', 800);
      this.haptics.vibrate(75);
    }
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    if (this.isReturning) return false;

    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;
    const centerY = my + mh / 2 + 10;
    const rotorRadius = Math.min(mw, mh) * 0.32;

    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.hypot(dx, dy);

    // Check hit on the rotor wheel area
    if (dist <= rotorRadius + 10 && dist >= rotorRadius * 0.4) {
      this.isDragging = true;
      this.initialTouchAngle = Math.atan2(dy, dx);
      this.dragStartAngle = this.currentAngle;
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
    let diff = currentTouchAngle - this.initialTouchAngle;

    // Handle wrap-around math
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;

    // Restrict to clockwise rotation only (diff > 0)
    let newAngle = this.dragStartAngle + diff;
    newAngle = Math.max(0, Math.min(this.stopAngle, newAngle));

    if (Math.abs(newAngle - this.currentAngle) > 0.02) {
      this.currentAngle = newAngle;

      // Clicky sounds as user winds the telephone rotor
      if (Math.abs(this.currentAngle - this.lastTickAngle) >= 0.12) {
        this.audio.play('synth:click', 280);
        this.haptics.lightTap();
        this.lastTickAngle = this.currentAngle;
      }
    }
  }

  public handlePointerUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      if (this.currentAngle > 0.05) {
        this.isReturning = true;
        this.lastTickAngle = this.currentAngle;
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
