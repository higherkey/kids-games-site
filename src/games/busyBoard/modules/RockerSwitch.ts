import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class RockerSwitch extends BaseBusyBoardModule {
  private isOn = false;
  private hasPower = true;
  private readonly onToggleCallback?: (state: boolean) => void;

  constructor(id: string, x: number, y: number, w: number, h: number, onToggle?: (state: boolean) => void) {
    super(id, x, y, w, h);
    this.onToggleCallback = onToggle;
  }

  public setPowerState(hasPower: boolean): void {
    this.hasPower = hasPower;
  }

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    // Margin for spacing
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    // Draw module background / faceplate (parchment/light grey with subtle shadow)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    
    ctx.fillStyle = '#F4F1EA'; // Parchment
    ctx.strokeStyle = '#D5C3A6'; // Indigo border / dark sand
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent'; // Reset shadow for stroke
    ctx.stroke();
    ctx.restore();

    // Draw Label/Title
    ctx.fillStyle = '#2F3061'; // Indigo
    ctx.font = 'bold 14px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('ROCKER SWITCH', mx + mw / 2, my + 15);

    // Switch Socket (dark inset rectangle)
    const swWidth = mw * 0.4;
    const swHeight = mh * 0.5;
    const swX = mx + (mw - swWidth) / 2;
    const swY = my + (mh - swHeight) / 2 + 10;

    ctx.fillStyle = '#22252A'; // Dark socket
    this.roundRect(ctx, swX, swY, swWidth, swHeight, 8);
    ctx.fill();

    // Draw Rocker Button
    const btnY = swY + 4;
    const btnHeight = swHeight - 8;
    const btnWidth = swWidth - 8;
    const btnX = swX + 4;

    ctx.save();
    
    // Gradient for the rocker button
    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnHeight);
    
    if (this.isOn) {
      // Pressed at the top, protruding at the bottom
      btnGrad.addColorStop(0, '#3A3D42');
      btnGrad.addColorStop(0.3, '#1E2022');
      btnGrad.addColorStop(1, '#5C616A');
      
      ctx.fillStyle = btnGrad;
      this.roundRect(ctx, btnX, btnY, btnWidth, btnHeight, 6);
      ctx.fill();
      
      // Draw highlighted/pressed state
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(btnX, btnY, btnWidth, btnHeight / 2);
    } else {
      // Pressed at the bottom, protruding at the top
      btnGrad.addColorStop(0, '#5C616A');
      btnGrad.addColorStop(0.7, '#1E2022');
      btnGrad.addColorStop(1, '#3A3D42');
      
      ctx.fillStyle = btnGrad;
      this.roundRect(ctx, btnX, btnY, btnWidth, btnHeight, 6);
      ctx.fill();
      
      // Draw highlighted/pressed state
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(btnX, btnY, btnWidth, btnHeight / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(btnX, btnY + btnHeight / 2, btnWidth, btnHeight / 2);
    }
    ctx.restore();

    // LED Status Light
    const ledRadius = 6;
    const ledX = mx + mw / 2;
    const ledY = swY + swHeight + 20;

    ctx.beginPath();
    ctx.arc(ledX, ledY, ledRadius, 0, Math.PI * 2);
    
    if (!this.hasPower) {
      ctx.fillStyle = '#555555'; // Power cut / off
      ctx.fill();
    } else if (this.isOn) {
      ctx.fillStyle = '#4ECDC4'; // Teal glowing LED
      ctx.shadowColor = '#4ECDC4';
      ctx.shadowBlur = 10;
      ctx.fill();
    } else {
      ctx.fillStyle = '#FF6B6B'; // Red dark LED
      ctx.fill();
    }
    ctx.shadowColor = 'transparent';
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const swWidth = mw * 0.4;
    const swHeight = mh * 0.5;
    const swX = mx + (mw - swWidth) / 2;
    const swY = my + (mh - swHeight) / 2 + 10;

    // Check if touch is within switch bounds
    if (x >= swX && x <= swX + swWidth && y >= swY && y <= swY + swHeight) {
      this.isOn = !this.isOn;
      
      // Feedback
      this.audio.play(this.isOn ? 'busyboard:rocker_on' : 'busyboard:rocker_off');
      this.haptics.lightTap();

      if (this.onToggleCallback) {
        this.onToggleCallback(this.isOn);
      }
      return true;
    }

    return false;
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
