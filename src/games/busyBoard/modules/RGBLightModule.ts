import { BaseBusyBoardModule } from './BaseBusyBoardModule';
import type { LuminaryBoardGame } from '../LuminaryBoardGame';

export class RGBLightModule extends BaseBusyBoardModule {
  protected readonly game: any;
  private activeSlider: 'r' | 'g' | 'b' | null = null;
  private lastTickValue = { r: 0, g: 0, b: 0 };
  // Bulb tap feedback: phase 0 = idle, > 0 = expanding flash ring
  private bulbFlashPhase = 0;

  constructor(id: string, x: number, y: number, w: number, h: number, game: any) {
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

    const centerX = mx + mw / 2;

    // Faceplate
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

    // Title
    ctx.save();
    ctx.font = 'bold 14px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (theme === 'paper') {
      ctx.fillStyle = '#5A564C';
    } else {
      ctx.fillStyle = '#00FFCC';
      ctx.shadowColor = '#00FFCC';
      ctx.shadowBlur = 4;
    }
    ctx.fillText('RGB CENTRAL LIGHT', centerX, my + 14);
    ctx.restore();

    // --- DRAW CENTRAL LIGHT BULB / DOME (Top Half) ---
    const rgb = this.game.getRGB();
    const mixedColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    const bulbCenterY = my + mh * 0.32;
    const bulbRadius = 32;

    ctx.save();

    // Light bulb base/casing
    const casingY = bulbCenterY + 24;
    ctx.fillStyle = theme === 'paper' ? '#8C8578' : '#333333';
    ctx.fillRect(centerX - 18, casingY, 36, 10);
    ctx.fillRect(centerX - 12, casingY + 10, 24, 4);

    // Glowing aura behind the bulb
    const glowRad = 58;
    const bulbGlow = ctx.createRadialGradient(
      centerX, bulbCenterY - 8, 4,
      centerX, bulbCenterY - 8, glowRad
    );
    const brightness = (rgb.r + rgb.g + rgb.b) / 3 / 255;
    bulbGlow.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.1 + brightness * 0.7})`);
    bulbGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bulbGlow;
    ctx.beginPath();
    ctx.arc(centerX, bulbCenterY - 8, glowRad, 0, Math.PI * 2);
    ctx.fill();

    // The Glass Dome Bulb
    ctx.beginPath();
    ctx.arc(centerX, bulbCenterY - 8, bulbRadius, Math.PI * 0.8, Math.PI * 2.2);
    ctx.lineTo(centerX + 16, casingY);
    ctx.lineTo(centerX - 16, casingY);
    ctx.closePath();

    // Fill with active RGB color
    ctx.fillStyle = mixedColor;
    ctx.fill();

    // Glass sheen / highlight overlay
    const sheenGrad = ctx.createLinearGradient(
      centerX - bulbRadius, bulbCenterY - 8 - bulbRadius,
      centerX + bulbRadius, bulbCenterY - 8 + bulbRadius
    );
    sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    sheenGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
    sheenGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    ctx.fillStyle = sheenGrad;
    ctx.beginPath();
    ctx.arc(centerX, bulbCenterY - 8, bulbRadius, Math.PI * 0.8, Math.PI * 2.2);
    ctx.lineTo(centerX + 16, casingY);
    ctx.lineTo(centerX - 16, casingY);
    ctx.closePath();
    ctx.fill();

    // Dome outer metallic rim
    ctx.strokeStyle = theme === 'paper' ? '#5A564C' : '#66FCF1';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner Filament
    ctx.beginPath();
    ctx.moveTo(centerX - 8, bulbCenterY + 12);
    ctx.lineTo(centerX - 5, bulbCenterY - 8);
    ctx.lineTo(centerX + 5, bulbCenterY - 8);
    ctx.lineTo(centerX + 8, bulbCenterY + 12);
    ctx.strokeStyle = theme === 'paper' ? 'rgba(90, 86, 76, 0.6)' : 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Electrical sparkles if brightness is very high (deterministic, driven by animPhase)
    if (brightness > 0.85) {
      ctx.strokeStyle = theme === 'paper' ? 'rgba(255, 200, 80, 0.9)' : 'rgba(0, 255, 204, 0.9)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        // Use animPhase instead of Math.random() to avoid per-frame jitter
        const angle = (this.animPhase * 0.7 + i * (Math.PI * 2 / 3)) % (Math.PI * 2);
        const startDist = bulbRadius + 3;
        const endDist = startDist + 5 + Math.sin(this.animPhase + i) * 5;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * startDist, bulbCenterY - 8 + Math.sin(angle) * startDist);
        const midAngle = angle + 0.2 * Math.sin(this.animPhase * 2 + i);
        const midDist = (startDist + endDist) / 2;
        ctx.lineTo(centerX + Math.cos(midAngle) * midDist, bulbCenterY - 8 + Math.sin(midAngle) * midDist);
        ctx.lineTo(centerX + Math.cos(angle) * endDist, bulbCenterY - 8 + Math.sin(angle) * endDist);
        ctx.stroke();
      }
    }

    // Bulb tap flash ring (visual confirmation)
    if (this.bulbFlashPhase > 0) {
      this.bulbFlashPhase += 0.08;
      const flashRadius = bulbRadius + this.bulbFlashPhase * 20;
      const flashAlpha = Math.max(0, 1 - this.bulbFlashPhase / 1.5);
      ctx.save();
      ctx.globalAlpha = flashAlpha;
      ctx.strokeStyle = theme === 'paper' ? 'rgba(217, 119, 6, 0.8)' : 'rgba(0, 255, 204, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(centerX, bulbCenterY - 8, flashRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      if (this.bulbFlashPhase >= 1.5) this.bulbFlashPhase = 0;
    }
    ctx.restore();

    // --- DRAW THREE SLIDERS (Bottom Half) ---
    const sliderStartY = my + mh * 0.56;
    const sliderEndY = my + mh * 0.86;
    const sliderHeight = sliderEndY - sliderStartY;

    const channels: ('r' | 'g' | 'b')[] = ['r', 'g', 'b'];
    const colors = { r: '#FF2D55', g: '#4CD964', b: '#007AFF' };
    const labels = { r: 'RED', g: 'GREEN', b: 'BLUE' };

    channels.forEach((channel, idx) => {
      // Horizontal positioning for each slider: 20%, 50%, 80%
      const sliderX = mx + mw * (0.2 + idx * 0.3);
      const val = rgb[channel]; // 0 - 255

      // Slider track
      ctx.save();
      const trackGrad = ctx.createLinearGradient(sliderX, sliderEndY, sliderX, sliderStartY);
      trackGrad.addColorStop(0, '#000000');
      trackGrad.addColorStop(1, colors[channel]);

      ctx.strokeStyle = trackGrad;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sliderX, sliderStartY);
      ctx.lineTo(sliderX, sliderEndY);
      ctx.stroke();
      ctx.restore();

      // Slider knob/handle
      const knobY = sliderEndY - (val / 255) * sliderHeight;
      const knobR = 11;

      // Active Channel Ripple Arcs
      if (this.activeSlider === channel) {
        ctx.save();
        for (let i = 0; i < 3; i++) {
          const offset = ((this.animPhase + i * 0.8) % 2.5) * 9;
          const alpha = Math.max(0, 1 - offset / 22);
          ctx.strokeStyle = colors[channel];
          ctx.globalAlpha = alpha * 0.7;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sliderX, knobY, knobR + offset, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      ctx.arc(sliderX, knobY, knobR, 0, Math.PI * 2);
      if (theme === 'paper') {
        ctx.fillStyle = '#EAE6DF';
        ctx.strokeStyle = '#BCAE97';
      } else {
        ctx.fillStyle = '#282D37';
        ctx.strokeStyle = colors[channel];
      }
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();

      // Inside grip line
      ctx.beginPath();
      ctx.moveTo(sliderX - 5, knobY);
      ctx.lineTo(sliderX + 5, knobY);
      ctx.strokeStyle = theme === 'paper' ? '#4A473E' : '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Subtly display the rgb value and label under the slider
      ctx.save();
      ctx.font = 'bold 11px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      if (theme === 'paper') {
        ctx.fillStyle = '#7A7568';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      }
      ctx.fillText(labels[channel], sliderX, sliderEndY + 18);
      ctx.fillText(val.toString(), sliderX, sliderEndY + 32);
      ctx.restore();
    });
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 12;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;
    const bulbCenterY = my + mh * 0.32;
    const bulbRadius = 32;

    // Check click on the light bulb/dome
    const dist = Math.hypot(x - centerX, y - (bulbCenterY - 8));
    if (dist <= bulbRadius) {
      const rgb = this.game.getRGB();
      const brightness = (rgb.r + rgb.g + rgb.b) / 3 / 255;
      this.audio.play('synth:bell', 300 + brightness * 600);
      this.haptics.lightTap();
      this.bulbFlashPhase = 0.01; // Trigger expanding flash ring
      return true;
    }

    // Check clicks on the slider knobs
    const sliderStartY = my + mh * 0.56;
    const sliderEndY = my + mh * 0.86;
    const sliderHeight = sliderEndY - sliderStartY;
    const rgb = this.game.getRGB();
    const channels: ('r' | 'g' | 'b')[] = ['r', 'g', 'b'];

    for (let idx = 0; idx < channels.length; idx++) {
      const channel = channels[idx];
      const sliderX = mx + mw * (0.2 + idx * 0.3);
      const val = rgb[channel];
      const knobY = sliderEndY - (val / 255) * sliderHeight;

      const dx = x - sliderX;
      const dy = y - knobY;
      if (Math.hypot(dx, dy) <= 22) {
        this.activeSlider = channel;
        this.haptics.lightTap();
        
        const baseFreq = channel === 'r' ? 150 : channel === 'g' ? 300 : 450;
        const initialFreq = baseFreq + (val / 255) * (channel === 'r' ? 350 : channel === 'g' ? 600 : 900);
        this.audio.startGlide(`rgb_${channel}`, 'glass', initialFreq);
        return true;
      }
    }

    return false;
  }

  public handlePointerMove(_x: number, y: number, _px: number, py: number, _pw: number, ph: number): void {
    if (!this.activeSlider) return;

    const margin = 12;
    const my = py + margin;
    const mh = ph - margin * 2;

    const sliderStartY = my + mh * 0.56;
    const sliderEndY = my + mh * 0.86;
    const sliderHeight = sliderEndY - sliderStartY;

    let pct = (sliderEndY - y) / sliderHeight;
    pct = Math.max(0, Math.min(1, pct));

    const val = Math.round(pct * 255);
    this.game.updateRGB(this.activeSlider, val);

    // Smoothly update continuous pitch glide
    const baseFreq = this.activeSlider === 'r' ? 150 : this.activeSlider === 'g' ? 300 : 450;
    const targetFreq = baseFreq + (val / 255) * (this.activeSlider === 'r' ? 350 : this.activeSlider === 'g' ? 600 : 900);
    this.audio.updateGlide(`rgb_${this.activeSlider}`, targetFreq);

    if (Math.abs(val - this.lastTickValue[this.activeSlider]) >= 25) {
      this.haptics.lightTap();
      this.lastTickValue[this.activeSlider] = val;
    }
  }

  public handlePointerUp(): void {
    if (this.activeSlider) {
      this.audio.stopGlide(`rgb_${this.activeSlider}`);
      this.activeSlider = null;
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
