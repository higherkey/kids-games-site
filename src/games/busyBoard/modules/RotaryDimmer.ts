import { BaseBusyBoardModule } from './BaseBusyBoardModule';
import type { LuminaryBoardGame } from '../LuminaryBoardGame';
import { ToneAudioController } from '../../../core/ToneAudioController';

export class RotaryDimmer extends BaseBusyBoardModule {
  private readonly game: LuminaryBoardGame;

  private dimmerValue = 0.5; // 0.0 to 1.0
  private isDragging = false;
  private lastTickValue = 0.5;
  private animPhase = 0;

  constructor(id: string, x: number, y: number, w: number, h: number, game: LuminaryBoardGame) {
    super(id, x, y, w, h);
    this.game = game;
  }

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    const theme = this.game.getTheme();
    const margin = 12;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;
    this.animPhase += 0.05;

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
    ctx.fillText('ROTARY DIMMER', mx + mw / 2, my + 12);
    ctx.restore();

    // Layout dimensions inside the card
    const centerY = my + mh * 0.65;
    const centerX = mx + mw / 2;
    const dialRadius = Math.min(mw, mh) * 0.22;

    // Tailored rotary arc gauge glow while turning (dragging)
    if (this.isDragging) {
      ctx.save();
      const startAngle = -Math.PI * 0.75;
      const currentAngle = startAngle + this.dimmerValue * (Math.PI * 1.5);
      
      ctx.shadowColor = theme === 'paper' ? '#D97706' : '#00FFCC';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = theme === 'paper' ? 'rgba(217, 119, 6, 0.75)' : 'rgba(0, 255, 204, 0.85)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, dialRadius + 8, startAngle, currentAngle);
      ctx.stroke();
      ctx.restore();
    }

    this.drawLightBulb(ctx, theme, centerX, my + mh * 0.3, 18);
    this.drawDial(ctx, theme, centerX, centerY, dialRadius);
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 12;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerY = my + mh * 0.65;
    const centerX = mx + mw / 2;
    const dialRadius = Math.min(mw, mh) * 0.22;

    // Check if pointer is on the dial
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.hypot(dx, dy);

    // Expand touch radius slightly for kids playability
    if (dist <= dialRadius + 15) {
      this.isDragging = true;
      this.haptics.lightTap();
      this.updateValueFromPointer(x, y, centerX, centerY);
      return true;
    }
    return false;
  }

  public handlePointerMove(x: number, y: number, px: number, py: number, pw: number, ph: number): void {
    if (!this.isDragging) return;

    const margin = 12;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerY = my + mh * 0.65;
    const centerX = mx + mw / 2;

    this.updateValueFromPointer(x, y, centerX, centerY);

    const v = Math.round(this.dimmerValue * 255);
    ToneAudioController.getInstance().updateLightBoardTone({
      red: v,
      green: v,
      blue: v,
      brightness: this.dimmerValue
    });
  }

  public handlePointerUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      ToneAudioController.getInstance().stopLightBoardTone();
      this.audio.play('synth:click', 300);
    }
  }



  private updateValueFromPointer(x: number, y: number, cx: number, cy: number) {
    const dx = x - cx;
    const dy = y - cy;
    
    // Angle from top direction (pointing up is 0, clockwise positive)
    // Note: Math.atan2 takes (y, x). Standard angle starting from +X-axis.
    // We want angle starting from -Y-axis (straight up).
    // angle = Math.atan2(dx, -dy) which matches our draw math: dx = sin(a), dy = -cos(a)
    let angle = Math.atan2(dx, -dy);

    const startAngle = -Math.PI * 0.75;
    const endAngle = Math.PI * 0.75;

    // Normalize angle to dial range
    if (angle < -Math.PI * 0.9) {
      angle = startAngle; // snap to minimum
    } else if (angle > Math.PI * 0.9) {
      angle = endAngle; // snap to maximum
    }

    // Clamp angle between startAngle and endAngle
    let pct = (angle - startAngle) / (endAngle - startAngle);
    pct = Math.max(0, Math.min(1, pct));

    this.dimmerValue = pct;

    // Play subtle synth tick sounds as user dials
    const tickStep = 0.08;
    if (Math.abs(this.dimmerValue - this.lastTickValue) >= tickStep) {
      const pitch = 300 + this.dimmerValue * 600; // Pitch increases as brightness increases
      this.audio.play('synth:click', pitch);
      this.haptics.lightTap();
      this.lastTickValue = this.dimmerValue;
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

  private drawLightBulb(ctx: CanvasRenderingContext2D, theme: string, centerX: number, bulbY: number, bulbRadius: number): void {
    ctx.save();
    // Bulb glow effect
    if (this.dimmerValue > 0.02) {
      const glowGrad = ctx.createRadialGradient(
        centerX, bulbY, 2,
        centerX, bulbY, bulbRadius * 2.5
      );
      if (theme === 'paper') {
        glowGrad.addColorStop(0, `rgba(255, 230, 150, ${this.dimmerValue * 0.75})`);
        glowGrad.addColorStop(0.5, `rgba(255, 200, 100, ${this.dimmerValue * 0.3})`);
        glowGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
      } else {
        glowGrad.addColorStop(0, `rgba(0, 255, 204, ${this.dimmerValue * 0.8})`);
        glowGrad.addColorStop(0.5, `rgba(0, 150, 255, ${this.dimmerValue * 0.35})`);
        glowGrad.addColorStop(1, 'rgba(0, 150, 255, 0)');
      }
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, bulbY, bulbRadius * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bulb silhouette
    ctx.beginPath();
    ctx.arc(centerX, bulbY, bulbRadius, Math.PI * 0.75, Math.PI * 2.25);
    ctx.lineTo(centerX + 6, bulbY + bulbRadius + 2);
    ctx.lineTo(centerX - 6, bulbY + bulbRadius + 2);
    ctx.closePath();

    if (theme === 'paper') {
      ctx.strokeStyle = '#5A564C';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = this.dimmerValue > 0.05 ? `rgba(255, 240, 180, ${this.dimmerValue})` : '#EAE6DF';
    } else {
      ctx.strokeStyle = '#66FCF1';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = this.dimmerValue > 0.05 ? `rgba(0, 255, 204, ${0.2 + this.dimmerValue * 0.6})` : '#1A1D24';
    }
    ctx.fill();
    ctx.stroke();

    // Filament glow
    if (this.dimmerValue > 0.1) {
      ctx.beginPath();
      ctx.moveTo(centerX - 6, bulbY + 5);
      ctx.lineTo(centerX - 3, bulbY - 5);
      ctx.lineTo(centerX + 3, bulbY - 5);
      ctx.lineTo(centerX + 6, bulbY + 5);
      ctx.strokeStyle = theme === 'paper' ? `rgba(255, 120, 0, ${this.dimmerValue})` : `rgba(255, 255, 255, ${this.dimmerValue})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Screw base
    ctx.fillStyle = theme === 'paper' ? '#8C8578' : '#333';
    ctx.fillRect(centerX - 7, bulbY + bulbRadius + 2, 14, 5);
    ctx.fillRect(centerX - 5, bulbY + bulbRadius + 7, 10, 3);
    ctx.restore();
  }

  private drawDialTicks(ctx: CanvasRenderingContext2D, theme: string, centerX: number, centerY: number, dialRadius: number): void {
    const numTicks = 9;
    const startAngle = -Math.PI * 0.75;
    const endAngle = Math.PI * 0.75;
    ctx.lineWidth = 2;
    for (let i = 0; i < numTicks; i++) {
      const fraction = i / (numTicks - 1);
      const angle = startAngle + fraction * (endAngle - startAngle);
      const outerX = centerX + Math.sin(angle) * (dialRadius + 8);
      const outerY = centerY - Math.cos(angle) * (dialRadius + 8);
      const innerX = centerX + Math.sin(angle) * (dialRadius + 3);
      const innerY = centerY - Math.cos(angle) * (dialRadius + 3);
      
      if (fraction <= this.dimmerValue && this.dimmerValue > 0) {
        ctx.strokeStyle = theme === 'paper' ? '#B58B55' : '#00FFCC';
      } else {
        ctx.strokeStyle = theme === 'paper' ? '#C4B599' : '#333B44';
      }
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();
    }
  }

  private drawDial(ctx: CanvasRenderingContext2D, theme: string, centerX: number, centerY: number, dialRadius: number): void {
    ctx.save();
    
    // Outer tick marks
    this.drawDialTicks(ctx, theme, centerX, centerY, dialRadius);

    // Dial background
    ctx.beginPath();
    ctx.arc(centerX, centerY, dialRadius, 0, Math.PI * 2);
    if (theme === 'paper') {
      const dialGrad = ctx.createLinearGradient(centerX - dialRadius, centerY - dialRadius, centerX + dialRadius, centerY + dialRadius);
      dialGrad.addColorStop(0, '#EAE6DF');
      dialGrad.addColorStop(1, '#D8D1C5');
      ctx.fillStyle = dialGrad;
      ctx.strokeStyle = '#BCAE97';
    } else {
      const dialGrad = ctx.createLinearGradient(centerX - dialRadius, centerY - dialRadius, centerX + dialRadius, centerY + dialRadius);
      dialGrad.addColorStop(0, '#282D37');
      dialGrad.addColorStop(1, '#15191F');
      ctx.fillStyle = dialGrad;
      ctx.strokeStyle = '#333B44';
    }
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Indicator line
    const startAngle = -Math.PI * 0.75;
    const endAngle = Math.PI * 0.75;
    const activeAngle = startAngle + this.dimmerValue * (endAngle - startAngle);
    const indX = centerX + Math.sin(activeAngle) * (dialRadius - 6);
    const indY = centerY - Math.cos(activeAngle) * (dialRadius - 6);

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(indX, indY);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    if (theme === 'paper') {
      ctx.strokeStyle = '#4A473E';
    } else {
      ctx.strokeStyle = '#00FFCC';
      ctx.shadowColor = '#00FFCC';
      ctx.shadowBlur = 5;
    }
    ctx.stroke();
    
    // Center cap
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fillStyle = theme === 'paper' ? '#4A473E' : '#00FFCC';
    ctx.fill();

    ctx.restore();
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
