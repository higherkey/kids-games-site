import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class PullStringCord extends BaseBusyBoardModule {
  private isOn = false;
  private hasPower = true;

  private isDragging = false;
  private dragOffset = 0; // vertical drag offset of cord handle
  private readonly maxDrag = 80;   // maximum pull distance

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

    // Faceplate Background
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#EAE8E1'; // Soft warm gray
    ctx.strokeStyle = '#C4C2B9';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Title
    ctx.fillStyle = '#4A4843';
    ctx.font = 'bold 12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('PULL STRING CORD', mx + mw / 2, my + 15);
    ctx.restore();

    // Center Points
    const centerX = mx + mw / 2;
    
    // Draw the Light Bulb
    const bulbY = my + mh * 0.3;
    const bulbRadius = Math.min(mw, mh) * 0.15;
    
    ctx.save();
    
    // Light bulb base socket (metallic screw cap)
    ctx.fillStyle = '#9E9E9E';
    ctx.fillRect(centerX - 10, bulbY - bulbRadius - 10, 20, 15);
    ctx.fillStyle = '#757575';
    ctx.fillRect(centerX - 12, bulbY - bulbRadius - 13, 24, 3);
    ctx.fillRect(centerX - 12, bulbY - bulbRadius - 7, 24, 3);
    
    // Glow aura if on and powered
    if (this.isOn && this.hasPower) {
      const glowGrad = ctx.createRadialGradient(centerX, bulbY, bulbRadius * 0.5, centerX, bulbY, bulbRadius * 2);
      glowGrad.addColorStop(0, 'rgba(255, 235, 59, 0.8)');
      glowGrad.addColorStop(0.3, 'rgba(255, 235, 59, 0.4)');
      glowGrad.addColorStop(1, 'rgba(255, 235, 59, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, bulbY, bulbRadius * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glass Bulb Outline
    ctx.beginPath();
    ctx.arc(centerX, bulbY, bulbRadius, 0, Math.PI * 2);
    
    if (this.isOn && this.hasPower) {
      ctx.fillStyle = '#FFEE58'; // Bright yellow fill
      ctx.strokeStyle = '#FBC02D';
    } else {
      ctx.fillStyle = '#EEEEEE'; // Dead glass gray
      ctx.strokeStyle = '#BDBDBD';
    }
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    // Filament inside bulb
    ctx.strokeStyle = this.isOn && this.hasPower ? '#E65100' : '#9E9E9E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 8, bulbY + 5);
    ctx.lineTo(centerX - 5, bulbY - 8);
    ctx.lineTo(centerX + 5, bulbY - 8);
    ctx.lineTo(centerX + 8, bulbY + 5);
    ctx.stroke();
    
    ctx.restore();

    // Draw the Pull Cord String
    const cordStartY = bulbY + bulbRadius;
    const stringRestY = my + mh * 0.72; // normal resting endpoint of string
    
    // Spring back physics
    if (!this.isDragging) {
      this.dragOffset += (0 - this.dragOffset) * 0.25;
    }
    
    const handleY = stringRestY + this.dragOffset;

    ctx.save();
    // The string line
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(centerX, cordStartY);
    ctx.lineTo(centerX, handleY - 10);
    ctx.stroke();

    // Tiny bell pull handle at the bottom of cord
    const handleRadius = 10;
    const hGrad = ctx.createLinearGradient(centerX - handleRadius, handleY, centerX + handleRadius, handleY);
    hGrad.addColorStop(0, '#BDBDBD');
    hGrad.addColorStop(0.5, '#FFFFFF');
    hGrad.addColorStop(1, '#9E9E9E');
    
    ctx.fillStyle = hGrad;
    ctx.strokeStyle = '#757575';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, handleY, handleRadius, 0, Math.PI * 2);
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
    const stringRestY = my + mh * 0.72;
    const handleY = stringRestY + this.dragOffset;

    // Detect click in surrounding area of handle ring
    const dist = Math.hypot(x - centerX, y - handleY);
    if (dist < 30) {
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
    const stringRestY = my + mh * 0.72;

    // Stretch the cord downward
    let offset = y - stringRestY;
    offset = Math.max(0, Math.min(this.maxDrag, offset));
    this.dragOffset = offset;

    // Trigger toggle if pulled near max
    if (this.dragOffset >= this.maxDrag - 5 && !this.isOnPullLimitReached()) {
      // Toggle state immediately
      this.isOn = !this.isOn;
      this.audio.play('busyboard:pull_cord');
      this.haptics.lightTap();
      
      // Momentarily register pull-limit reached by resetting drag start offset to prevent re-triggering
      this.isDragging = false; 
    }
  }

  private isOnPullLimitReached(): boolean {
    return false; // stub to prevent repeat checks during same drag session
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
