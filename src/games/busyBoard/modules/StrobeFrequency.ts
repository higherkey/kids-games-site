import { BaseBusyBoardModule } from './BaseBusyBoardModule';
import type { LuminaryBoardGame } from '../LuminaryBoardGame';

export class StrobeFrequency extends BaseBusyBoardModule {
  private readonly game: LuminaryBoardGame;

  private value = 0.2; // Slider value: 0.0 to 1.0
  private isDragging = false;
  private ledOn = false;
  private timeSinceFlash = 0;
  private animPhase = 0;

  constructor(id: string, x: number, y: number, w: number, h: number, game: LuminaryBoardGame) {
    super(id, x, y, w, h);
    this.game = game;
  }

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    this.animPhase += 0.05;
    const theme = this.game.getTheme();
    const margin = 12;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;

    this.drawOuterFaceplate(ctx, theme, mx, my, mw, mh);

    // Title
    ctx.save();
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (theme === 'paper') {
      ctx.fillStyle = '#5A564C';
    } else {
      ctx.fillStyle = '#00FFCC';
      ctx.shadowColor = '#00FFCC';
      ctx.shadowBlur = 4;
    }
    ctx.fillText('STROBE FREQUENCY', centerX, my + 12);
    ctx.restore();

    // 1. Draw Linear Slider (Left Column)
    const sliderX = mx + mw * 0.25;
    const sliderStartY = my + mh * 0.35;
    const sliderEndY = my + mh * 0.85;
    const sliderHeight = sliderEndY - sliderStartY;

    ctx.save();
    ctx.strokeStyle = theme === 'paper' ? '#E3D7C1' : '#2C353F';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sliderX, sliderStartY);
    ctx.lineTo(sliderX, sliderEndY);
    ctx.stroke();

    // Active Slider segment
    const knobY = sliderEndY - this.value * sliderHeight;
    ctx.strokeStyle = theme === 'paper' ? '#B58B55' : '#00FFCC';
    ctx.beginPath();
    ctx.moveTo(sliderX, knobY);
    ctx.lineTo(sliderX, sliderEndY);
    ctx.stroke();

    // Slider Knob
  ctx.fillStyle = theme === 'paper' ? '#EAE6DF' : '#282D37';
  ctx.strokeStyle = theme === 'paper' ? '#BCAE97' : '#00FFCC';
  ctx.lineWidth = 3;

  if (this.isDragging) {
    ctx.save();
    const pulseSpeed = 1 + this.value * 8;
    const pulseAlpha = (Math.sin(this.animPhase * pulseSpeed) + 1) * 0.4;
    ctx.strokeStyle = theme === 'paper' ? `rgba(217, 119, 6, ${pulseAlpha})` : `rgba(0, 255, 204, ${pulseAlpha})`;
    ctx.lineWidth = 3;
    const barWidth = 16 + this.value * 12;
    ctx.beginPath();
    ctx.moveTo(sliderX - barWidth, knobY);
    ctx.lineTo(sliderX + barWidth, knobY);
    ctx.stroke();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(sliderX, knobY, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

    this.drawLEDGrid(ctx, theme, mx, my, mw, mh);

    // Update Strobe interval state
    this.updateFlash();
  }

  private updateFlash() {
    // interval maps from 1000ms (value=0) down to 60ms (value=1)
    if (this.value <= 0.02) {
      this.ledOn = false;
      return;
    }

    const interval = 1000 - this.value * 940;
    
    // Using simple timestamp intervals (delta time mock)
    const dt = 16.67; // approx 60fps dt
    this.timeSinceFlash += dt;
    if (this.timeSinceFlash >= interval) {
      this.ledOn = !this.ledOn;
      this.timeSinceFlash = 0;

      // Play strobe sound click only when the slider is being moved or held
      if (this.ledOn && this.isDragging) {
        const clickPitch = 500 + this.value * 1200;
        this.audio.play('busyboard:dip', clickPitch);
        this.haptics.lightTap();
      }
    }
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 12;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const sliderX = mx + mw * 0.25;
    const sliderStartY = my + mh * 0.35;
    const sliderEndY = my + mh * 0.85;
    const sliderHeight = sliderEndY - sliderStartY;

    const knobY = sliderEndY - this.value * sliderHeight;

    const dx = x - sliderX;
    const dy = y - knobY;
    const dist = Math.hypot(dx, dy);

    if (dist <= 25) {
      this.isDragging = true;
      this.haptics.lightTap();
      return true;
    }
    return false;
  }

  public handlePointerMove(_x: number, y: number, _px: number, py: number, _pw: number, ph: number): void {
    if (!this.isDragging) return;

    const margin = 12;
    const my = py + margin;
    const mh = ph - margin * 2;

    const sliderStartY = my + mh * 0.35;
    const sliderEndY = my + mh * 0.85;
    const sliderHeight = sliderEndY - sliderStartY;

    let pct = (sliderEndY - y) / sliderHeight;
    pct = Math.max(0, Math.min(1, pct));

    this.value = pct;
  }

  public handlePointerUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.audio.play('synth:click', 400);
    }
  }



  private drawOuterFaceplate(ctx: CanvasRenderingContext2D, theme: string, mx: number, my: number, mw: number, mh: number): void {
    ctx.save();
    ctx.shadowColor = theme === 'paper' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 255, 204, 0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    if (theme === 'paper') {
      ctx.fillStyle = '#FAF8F5';
      ctx.strokeStyle = '#D5C3A6';
    } else {
      ctx.fillStyle = '#1A1D24';
      ctx.strokeStyle = '#00FFCC';
    }
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();
    ctx.restore();
  }

  private drawLEDGrid(ctx: CanvasRenderingContext2D, theme: string, mx: number, my: number, mw: number, mh: number): void {
    const ledGridX = mx + mw * 0.55;
    const ledGridY = my + mh * 0.35;
    const ledSpacingX = 22;
    const ledSpacingY = 22;

    const activeColor = theme === 'paper' ? '#FF2D55' : '#00FFCC';
    const inactiveColor = theme === 'paper' ? '#EAE6DF' : '#282D37';

    ctx.save();
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const lx = ledGridX + col * ledSpacingX;
        const ly = ledGridY + row * ledSpacingY;
        this.drawSingleLED(ctx, theme, lx, ly, activeColor, inactiveColor);
      }
    }
    ctx.restore();
  }

  private drawSingleLED(
    ctx: CanvasRenderingContext2D,
    theme: string,
    lx: number,
    ly: number,
    activeColor: string,
    inactiveColor: string
  ): void {
    // Draw bezel
    ctx.strokeStyle = theme === 'paper' ? '#BCAE97' : '#333B44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lx, ly, 7, 0, Math.PI * 2);
    ctx.stroke();

    // Fill LED bulb
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    if (this.ledOn && this.value > 0.02) {
      ctx.fillStyle = activeColor;
      if (theme === 'neon') {
        ctx.shadowColor = '#00FFCC';
        ctx.shadowBlur = 6;
      }
    } else {
      ctx.fillStyle = inactiveColor;
      ctx.shadowBlur = 0;
    }
    ctx.fill();
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
