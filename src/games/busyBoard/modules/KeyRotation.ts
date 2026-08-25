import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class KeyRotation extends BaseBusyBoardModule {
  private isUnlocked = false;
  private hasPower = true;

  private isDragging = false;
  private rotationAngle = 0; // Current angle in radians (0 to Math.PI/2)
  private lastAngle = 0;
  
  constructor(id: string, x: number, y: number, w: number, h: number) {
    super(id, x, y, w, h);
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

    // Brass Base Plate
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    
    const brassGrad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
    brassGrad.addColorStop(0, '#E5A93B'); // Bright brass
    brassGrad.addColorStop(0.5, '#C49132'); // Golden sand
    brassGrad.addColorStop(1, '#8C621E'); // Dark brass
    
    ctx.fillStyle = brassGrad;
    ctx.strokeStyle = '#6E4D17';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Title
    ctx.fillStyle = '#42300D';
    ctx.font = 'bold 12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('KEY ROTATION', mx + mw / 2, my + 15);
    ctx.restore();

    const centerX = mx + mw * 0.45; // Shift left slightly to make room for deadbolt on the right
    const centerY = my + mh / 2 + 10;

    // Draw the Deadbolt chamber and sliding lock bolt on the right side
    const boltX = mx + mw * 0.72;
    const boltY = centerY - 15;
    const boltW = mw * 0.22;
    const boltH = 30;

    ctx.save();
    // Deadbolt socket housing (Dark recess)
    ctx.fillStyle = '#222222';
    ctx.fillRect(boltX, boltY, boltW, boltH);

    // Sliding bolt (Steel rectangular bar)
    // If rotationAngle = 0 (locked), bolt extends right, flush with border.
    // If rotationAngle = Math.PI / 2 (unlocked), bolt is retracted to the left.
    const maxRetraction = boltW - 5;
    const currentRetraction = (this.rotationAngle / (Math.PI / 2)) * maxRetraction;
    const currentBoltX = boltX - currentRetraction;

    ctx.fillStyle = '#9E9E9E'; // Steel gray
    ctx.strokeStyle = '#616161';
    ctx.lineWidth = 2;
    ctx.fillRect(currentBoltX, boltY + 3, boltW, boltH - 6);
    ctx.strokeRect(currentBoltX, boltY + 3, boltW, boltH - 6);
    
    // Bolt lock pin hole
    ctx.fillStyle = '#424242';
    ctx.beginPath();
    ctx.arc(currentBoltX + boltW * 0.6, boltY + boltH / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Keyhole Bezel Ring
    ctx.save();
    const bezelR = 30;
    const bezelGrad = ctx.createRadialGradient(centerX, centerY, bezelR * 0.7, centerX, centerY, bezelR);
    bezelGrad.addColorStop(0, '#8C621E');
    bezelGrad.addColorStop(0.5, '#E5A93B');
    bezelGrad.addColorStop(1, '#5C4012');
    ctx.fillStyle = bezelGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, bezelR, 0, Math.PI * 2);
    ctx.fill();

    // The dark keyhole shape
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.arc(centerX, centerY - 4, 5, 0, Math.PI * 2); // circular head
    ctx.moveTo(centerX - 3, centerY - 2);
    ctx.lineTo(centerX + 3, centerY - 2);
    ctx.lineTo(centerX + 4, centerY + 10);
    ctx.lineTo(centerX - 4, centerY + 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw Brass Key
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.rotationAngle);

    // Key stem (brass tube)
    ctx.strokeStyle = '#D4AF37'; // Gold
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -22); // points upwards by default
    ctx.stroke();

    // Key bow (handle ring)
    ctx.fillStyle = '#D4AF37';
    ctx.strokeStyle = '#AA7C11';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 16, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Key bow inner cutout
    ctx.fillStyle = '#5C4012'; // color of key slot bg under rotation
    ctx.beginPath();
    ctx.arc(0, 16, 5, 0, Math.PI * 2);
    ctx.fill();

    // Key bit (teeth cuts)
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(-7, -22, 7, 8); // teeth sticking to left
    ctx.fillStyle = '#AA7C11';
    ctx.fillRect(-7, -20, 2, 2); // tiny notch cutout
    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw * 0.45;
    const centerY = my + mh / 2 + 10;

    // Detect touch near the key bow or stem
    const dist = Math.hypot(x - centerX, y - centerY);
    if (dist < 45) {
      this.isDragging = true;
      this.lastAngle = Math.atan2(y - centerY, x - centerX);
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

    const centerX = mx + mw * 0.45;
    const centerY = my + mh / 2 + 10;

    const currentAngle = Math.atan2(y - centerY, x - centerX);
    let delta = currentAngle - this.lastAngle;
    
    // Handle wrap-around
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    // Apply rotation increment
    let newRotation = this.rotationAngle + delta;
    
    // Lock range between 0 and 90 degrees (Math.PI / 2)
    newRotation = Math.max(0, Math.min(Math.PI / 2, newRotation));
    
    if (Math.abs(newRotation - this.rotationAngle) > 0.02) {
      // Satisfying micro-ticks haptic and audio click as the key turns
      const stepBefore = Math.floor((this.rotationAngle / (Math.PI / 2)) * 8);
      const stepAfter = Math.floor((newRotation / (Math.PI / 2)) * 8);
      if (stepBefore !== stepAfter) {
        this.audio.play('synth:click', 450 + stepAfter * 40);
        this.haptics.lightTap();
      }
      this.rotationAngle = newRotation;
    }
    
    this.lastAngle = currentAngle;
  }

  public handlePointerUp(): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    // Snap to nearest lock state (0 or Math.PI / 2)
    const midPoint = Math.PI / 4;
    const targetAngle = this.rotationAngle > midPoint ? Math.PI / 2 : 0;
    const finalUnlocked = targetAngle > midPoint;

    if (finalUnlocked !== this.isUnlocked) {
      this.isUnlocked = finalUnlocked;
      
      // Heavy end clack feedback
      this.audio.play('busyboard:key_turn');
      this.haptics.heavyImpact();
    }
    
    this.rotationAngle = targetAngle;
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
