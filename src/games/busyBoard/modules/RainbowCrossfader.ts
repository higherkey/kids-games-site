import { BaseBusyBoardModule } from './BaseBusyBoardModule';
import type { LuminaryBoardGame } from '../LuminaryBoardGame';
import { ToneAudioController } from '../../../core/ToneAudioController';

function hslToRgb(h: number, s: number, l: number) {
  h /= 360;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    r = hue2rgb(h + 1 / 3);
    g = hue2rgb(h);
    b = hue2rgb(h - 1 / 3);
  }
  return { red: Math.round(r * 255), green: Math.round(g * 255), blue: Math.round(b * 255) };
}

export class RainbowCrossfader extends BaseBusyBoardModule {
  private readonly game: LuminaryBoardGame;
  private value = 0.5; // 0.0 to 1.0 (maps to HSL 0-360)
  private isDragging = false;
  private lastTickValue = 0.5;
  private trailPoints: { x: number; y: number; color: string; alpha: number }[] = [];

  constructor(id: string, x: number, y: number, w: number, h: number, game: LuminaryBoardGame) {
    super(id, x, y, w, h);
    this.game = game;
  }

  private animPhase = 0;

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    this.animPhase += 0.05;
    const theme = this.game.getTheme();
    const margin = 12;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    // Faceplate
    ctx.save();
    ctx.shadowColor = theme === 'paper' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 0, 255, 0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    if (theme === 'paper') {
      ctx.fillStyle = '#FAF8F5';
      ctx.strokeStyle = '#D5C3A6';
    } else {
      ctx.fillStyle = '#1A1D24';
      ctx.strokeStyle = '#FF007F';
    }
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();
    ctx.restore();

    // Title
    ctx.save();
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (theme === 'paper') {
      ctx.fillStyle = '#5A564C';
    } else {
      ctx.fillStyle = '#FF00FF';
      ctx.shadowColor = '#FF00FF';
      ctx.shadowBlur = 4;
    }
    ctx.fillText('RAINBOW CROSSFADER', mx + mw / 2, my + 12);
    ctx.restore();

    // Track coordinates (Horizontal fader)
    const trackStartY = my + mh * 0.6;
    const trackStartX = mx + mw * 0.15;
    const trackEndX = mx + mw * 0.85;
    const trackWidth = trackEndX - trackStartX;

    // Draw neon trail path if any points exist
    this.updateTrail();
    ctx.save();
    this.trailPoints.forEach(pt => {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // Draw the spectrum track background
    ctx.save();
    const spectrumGrad = ctx.createLinearGradient(trackStartX, trackStartY, trackEndX, trackStartY);
    spectrumGrad.addColorStop(0, 'hsl(0, 100%, 50%)');
    spectrumGrad.addColorStop(0.17, 'hsl(60, 100%, 50%)');
    spectrumGrad.addColorStop(0.33, 'hsl(120, 100%, 50%)');
    spectrumGrad.addColorStop(0.5, 'hsl(180, 100%, 50%)');
    spectrumGrad.addColorStop(0.67, 'hsl(240, 100%, 50%)');
    spectrumGrad.addColorStop(0.83, 'hsl(300, 100%, 50%)');
    spectrumGrad.addColorStop(1, 'hsl(360, 100%, 50%)');

    ctx.strokeStyle = spectrumGrad;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(trackStartX, trackStartY);
    ctx.lineTo(trackEndX, trackStartY);
    ctx.stroke();
    ctx.restore();

    // Slider knob
    const knobX = trackStartX + this.value * trackWidth;
    const activeColor = `hsl(${this.value * 360}, 100%, 50%)`;

    // Tailored HSL Spectral Knob Aura (only while dragging)
    if (this.isDragging) {
      ctx.save();
      const auraGrad = ctx.createRadialGradient(knobX, trackStartY, 4, knobX, trackStartY, 22);
      auraGrad.addColorStop(0, activeColor);
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(knobX, trackStartY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    ctx.beginPath();
    ctx.arc(knobX, trackStartY, 14, 0, Math.PI * 2);
    if (theme === 'paper') {
      ctx.fillStyle = '#EAE6DF';
      ctx.strokeStyle = '#BCAE97';
    } else {
      ctx.fillStyle = '#282D37';
      ctx.strokeStyle = activeColor;
    }
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    // Inner glowing dot
    ctx.beginPath();
    ctx.arc(knobX, trackStartY, 6, 0, Math.PI * 2);
    ctx.fillStyle = activeColor;
    ctx.fill();

    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 12;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const trackStartY = my + mh * 0.6;
    const trackStartX = mx + mw * 0.15;
    const trackEndX = mx + mw * 0.85;
    const trackWidth = trackEndX - trackStartX;

    const knobX = trackStartX + this.value * trackWidth;

    const dx = x - knobX;
    const dy = y - trackStartY;
    const dist = Math.hypot(dx, dy);

    if (dist <= 25) {
      this.isDragging = true;
      this.haptics.lightTap();
      return true;
    }
    return false;
  }

  public handlePointerMove(x: number, _y: number, px: number, py: number, pw: number, ph: number): void {
    if (!this.isDragging) return;

    const margin = 12;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const trackStartY = my + mh * 0.6;
    const trackStartX = mx + mw * 0.15;
    const trackEndX = mx + mw * 0.85;
    const trackWidth = trackEndX - trackStartX;

    let pct = (x - trackStartX) / trackWidth;
    pct = Math.max(0, Math.min(1, pct));

    this.value = pct;

    // Add trail point
    const knobX = trackStartX + this.value * trackWidth;
    const color = `hsl(${this.value * 360}, 100%, 50%)`;
    this.trailPoints.push({
      x: knobX,
      y: trackStartY,
      color,
      alpha: 1.0
    });

    // Modulate Light Board Tone dynamically based on current HSL -> RGB
    const rgb = hslToRgb(this.value * 360, 1.0, 0.5);
    ToneAudioController.getInstance().updateLightBoardTone(rgb);

    // Play chord sweeps using synth:pluck
    if (Math.abs(this.value - this.lastTickValue) >= 0.05) {
      const pitch = 250 + this.value * 450;
      this.audio.play('synth:pluck', pitch);
      this.haptics.lightTap();
      this.lastTickValue = this.value;
    }
  }

  public handlePointerUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      ToneAudioController.getInstance().stopLightBoardTone();
      this.audio.play('synth:click', 350);
    }
  }



  private updateTrail() {
    // Fade out and remove old trail points (no random drift — keeps animation smooth)
    this.trailPoints.forEach(pt => {
      pt.alpha -= 0.05;
    });
    this.trailPoints = this.trailPoints.filter(pt => pt.alpha > 0);
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
