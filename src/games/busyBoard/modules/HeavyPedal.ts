import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class HeavyPedal extends BaseBusyBoardModule {
  public isPressed = false;
  private hasPower = true;
  
  private compression = 0; // 0 (unpressed) to 1 (fully depressed)
  private readonly onPedalDownCallback?: () => void;

  constructor(id: string, x: number, y: number, w: number, h: number, onPedalDown?: () => void) {
    super(id, x, y, w, h);
    this.onPedalDownCallback = onPedalDown;
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

    // Faceplate (Textured Dark Iron Plate)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#2C3E50'; // Dark iron plate
    ctx.strokeStyle = '#1A252F';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Title
    ctx.fillStyle = '#BDC3C7';
    ctx.font = 'bold 12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('HEAVY FOOT PEDAL', mx + mw / 2, my + 15);
    ctx.restore();

    // Pedal socket housing (the recession underneath)
    const baseW = mw * 0.55;
    const baseH = mh * 0.7;
    const baseX = mx + (mw - baseW) / 2;
    const baseY = my + 35;

    ctx.fillStyle = '#111111';
    ctx.fillRect(baseX, baseY, baseW, baseH);

    // Physics interpolation
    if (!this.isPressed) {
      this.compression += (0 - this.compression) * 0.3;
    } else {
      this.compression += (1 - this.compression) * 0.45;
    }

    // Pedal rubber plate drawing (representing vertical perspective squish)
    // When compression = 0, pedal is drawn tall, offset upwards, casting a shadow.
    // When compression = 1, pedal is drawn shorter (compressed in perspective) and centered/downward.
    const pW = baseW - 8;
    const pH = baseH * (0.95 - this.compression * 0.22); // Squish height
    const pX = baseX + 4;
    const pY = baseY + 4 + this.compression * (baseH - pH - 8);

    ctx.save();
    // Shadow under the pedal
    if (this.compression < 0.95) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(pX + 3, pY + 6, pW, pH);
    }

    // Metal tread face
    const pedalGrad = ctx.createLinearGradient(pX, pY, pX, pY + pH);
    pedalGrad.addColorStop(0, '#7F8C8D'); // Brushed steel
    pedalGrad.addColorStop(0.5, '#95A5A6');
    pedalGrad.addColorStop(1, '#50595A');
    
    ctx.fillStyle = pedalGrad;
    ctx.fillRect(pX, pY, pW, pH);

    // Rubber tread lines (anti-slip horizontal bars)
    ctx.fillStyle = '#2C3E50'; // Dark rubber color
    const barCount = 6;
    const barH = 5;
    const barSpacing = (pH - (barCount * barH)) / (barCount + 1);

    for (let i = 0; i < barCount; i++) {
      const bx = pX + 8;
      const by = pY + barSpacing + i * (barH + barSpacing);
      const bw = pW - 16;
      ctx.fillRect(bx, by, bw, barH);
    }

    // Pivot axle bracket indicator (Bottom red hinge)
    ctx.fillStyle = '#C0392B';
    ctx.fillRect(baseX + baseW * 0.3, baseY + baseH - 8, baseW * 0.4, 6);

    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const baseW = mw * 0.55;
    const baseH = mh * 0.7;
    const baseX = mx + (mw - baseW) / 2;
    const baseY = my + 35;

    // Detect click within the pedal slot
    if (x >= baseX && x <= baseX + baseW && y >= baseY && y <= baseY + baseH) {
      this.isPressed = true;
      
      // Heavy thud sound and vibrate triggers
      this.audio.play('busyboard:pedal_thud');
      this.audio.play('synth:drum', 65);
      this.haptics.heavyImpact();

      if (this.onPedalDownCallback) {
        this.onPedalDownCallback();
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
