import { BaseBusyBoardModule } from './BaseBusyBoardModule';
import type { LuminaryBoardGame } from '../LuminaryBoardGame';

export class HaloExpander extends BaseBusyBoardModule {
  private readonly game: LuminaryBoardGame;

  private knobAngle = 0; // angle in radians
  private haloRadius = 15; // dynamic radius
  private isDragging = false;
  private lastTickValue = 0;
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
    const centerY = my + mh * 0.65;
    const knobRadius = Math.min(mw, mh) * 0.22;

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
    ctx.fillText('HALO EXPANDER', centerX, my + 12);
    ctx.restore();

    // 1. Draw glowing Halo at the top
  const haloY = my + mh * 0.3;
  const activeColor = theme === 'paper' ? 'rgba(255, 140, 0, 0.45)' : 'rgba(0, 255, 204, 0.5)';
  const outerGlow = theme === 'paper' ? 'rgba(255, 200, 100, 0)' : 'rgba(0, 150, 255, 0)';

  if (this.isDragging) {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const offset = ((this.animPhase + i * 0.8) % 2.5) * 10;
      const alpha = Math.max(0, 1 - offset / 25);
      ctx.strokeStyle = theme === 'paper' ? `rgba(255, 140, 0, ${alpha * 0.6})` : `rgba(0, 255, 204, ${alpha * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, haloY, this.haloRadius + offset, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

    ctx.save();
    const grad = ctx.createRadialGradient(centerX, haloY, 2, centerX, haloY, this.haloRadius);
    grad.addColorStop(0, activeColor);
    grad.addColorStop(0.5, activeColor);
    grad.addColorStop(1, outerGlow);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(centerX, haloY, this.haloRadius, 0, Math.PI * 2);
    ctx.fill();

    // Tiny center bulb node
    ctx.fillStyle = theme === 'paper' ? '#E67E22' : '#00FFCC';
    ctx.beginPath();
    ctx.arc(centerX, haloY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Draw Rotary Encoder Knob
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, knobRadius, 0, Math.PI * 2);
    if (theme === 'paper') {
      ctx.fillStyle = '#EAE6DF';
      ctx.strokeStyle = '#BCAE97';
    } else {
      ctx.fillStyle = '#282D37';
      ctx.strokeStyle = '#333B44';
    }
    ctx.lineWidth = 4;
    ctx.fill();
    ctx.stroke();

    // Encoder notches around dial
    ctx.strokeStyle = theme === 'paper' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    const numNotches = 12;
    for (let i = 0; i < numNotches; i++) {
      const angle = (i / numNotches) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(angle) * (knobRadius - 8), centerY + Math.sin(angle) * (knobRadius - 8));
      ctx.lineTo(centerX + Math.cos(angle) * knobRadius, centerY + Math.sin(angle) * knobRadius);
      ctx.stroke();
    }

    // Dial indicator line
    const indX = centerX + Math.cos(this.knobAngle) * (knobRadius - 6);
    const indY = centerY + Math.sin(this.knobAngle) * (knobRadius - 6);

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(indX, indY);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = theme === 'paper' ? '#4A473E' : '#00FFCC';
    ctx.stroke();

    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 12;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;
    const centerY = my + mh * 0.65;
    const knobRadius = Math.min(mw, mh) * 0.22;

    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist <= knobRadius + 15) {
      this.isDragging = true;
      this.haptics.lightTap();
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

    const centerX = mx + mw / 2;
    const centerY = my + mh * 0.65;

    // Calculate angle from center
    const angle = Math.atan2(y - centerY, x - centerX);
    
    // Track rotation delta
    let delta = angle - this.knobAngle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    this.knobAngle = angle;

    // Halo radius scales with rotation direction (min 10px, max 45px)
    this.haloRadius += delta * 12;
    this.haloRadius = Math.max(10, Math.min(45, this.haloRadius));

    // Play chime clicks on notches
    if (Math.abs(this.haloRadius - this.lastTickValue) >= 4) {
      const pitch = 300 + (this.haloRadius - 10) * 15;
      this.audio.play('synth:chime', pitch);
      this.haptics.lightTap();
      this.lastTickValue = this.haloRadius;
    }
  }

  public handlePointerUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.audio.play('synth:click', 400);
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
