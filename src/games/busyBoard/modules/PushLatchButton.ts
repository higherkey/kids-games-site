import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class PushLatchButton extends BaseBusyBoardModule {
  private isPressed = false;
  private hasPower = true;

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

    // Faceplate (Slate Gray)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#34495E'; 
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Title
    ctx.fillStyle = '#ECF0F1';
    ctx.font = 'bold 12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('PUSH LATCH BUTTON', mx + mw / 2, my + 15);
    ctx.restore();

    // Button socket bounds
    const btnSize = Math.min(mw, mh) * 0.45;
    const centerX = mx + mw / 2;
    const centerY = my + mh / 2 + 10;
    const btnX = centerX - btnSize / 2;
    const btnY = centerY - btnSize / 2;

    // Outer bezel housing
    ctx.fillStyle = '#1A252F';
    this.roundRect(ctx, btnX - 6, btnY - 6, btnSize + 12, btnSize + 12, 10);
    ctx.fill();

    // Inner socket (depth shadow)
    ctx.fillStyle = '#0F171E';
    this.roundRect(ctx, btnX - 2, btnY - 2, btnSize + 4, btnSize + 4, 8);
    ctx.fill();

    ctx.save();
    if (this.isPressed) {
      // Depressed/Pushed down state (Inset flat rendering)
      ctx.fillStyle = '#8B0000'; // Darker red
      this.roundRect(ctx, btnX + 3, btnY + 3, btnSize - 6, btnSize - 6, 6);
      ctx.fill();

      // Shadow overlay
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      this.roundRect(ctx, btnX + 3, btnY + 3, btnSize - 6, btnSize - 6, 6);
      ctx.fill();
    } else {
      // Unpressed/Popped out state (Raised 3D rendering)
      // 3D Shadow underneath
      ctx.fillStyle = '#5A0000';
      this.roundRect(ctx, btnX + 2, btnY + 5, btnSize - 4, btnSize - 4, 6);
      ctx.fill();

      // Button Face (Bright red gradient)
      const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnSize);
      btnGrad.addColorStop(0, '#FF4D4D');
      btnGrad.addColorStop(1, '#B30000');
      ctx.fillStyle = btnGrad;
      this.roundRect(ctx, btnX, btnY, btnSize - 4, btnSize - 4, 6);
      ctx.fill();

      // Glare highlight on top edge
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(btnX + 6, btnY + 2);
      ctx.lineTo(btnX + btnSize - 10, btnY + 2);
      ctx.stroke();
    }
    ctx.restore();

    // Tiny LED indicator on the button face
    const ledX = centerX;
    const ledY = this.isPressed ? centerY + 3 : centerY;
    const ledR = 5;

    ctx.save();
    ctx.beginPath();
    ctx.arc(ledX, ledY, ledR, 0, Math.PI * 2);
    if (!this.hasPower) {
      ctx.fillStyle = '#444444';
      ctx.fill();
    } else if (this.isPressed) {
      ctx.fillStyle = '#55E6C1'; // Glowing cyan LED
      ctx.shadowColor = '#55E6C1';
      ctx.shadowBlur = 6;
      ctx.fill();
    } else {
      ctx.fillStyle = '#FF7675'; // Dull red LED
      ctx.fill();
    }
    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const btnSize = Math.min(mw, mh) * 0.45;
    const centerX = mx + mw / 2;
    const centerY = my + mh / 2 + 10;
    const btnX = centerX - btnSize / 2;
    const btnY = centerY - btnSize / 2;

    // Check hit bounds
    if (x >= btnX - 6 && x <= btnX + btnSize + 6 && y >= btnY - 6 && y <= btnY + btnSize + 6) {
      this.isPressed = !this.isPressed;
      
      // Satisfying click haptics and audio pitch shifts
      this.audio.play('busyboard:push_button');
      this.haptics.lightTap();
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
