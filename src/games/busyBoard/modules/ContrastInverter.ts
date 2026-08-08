import { BaseBusyBoardModule } from './BaseBusyBoardModule';
import type { LuminaryBoardGame } from '../LuminaryBoardGame';

export class ContrastInverter extends BaseBusyBoardModule {
  private readonly game: LuminaryBoardGame;

  private state = false; // false = paper theme, true = neon theme
  private flipAnimTimer = 0;

  constructor(id: string, x: number, y: number, w: number, h: number, game: LuminaryBoardGame) {
    super(id, x, y, w, h);
    this.game = game;
  }

  public init(): void {
    // Set initial state matching game theme
    this.state = this.game.getTheme() === 'neon';
  }

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    const theme = this.game.getTheme();
    const margin = 12;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;
    const centerY = my + mh / 2 + 10;

    if (this.flipAnimTimer > 0) {
      this.flipAnimTimer -= 0.05;
      const radius = (1 - this.flipAnimTimer) * 40;
      const alpha = this.flipAnimTimer;
      ctx.save();
      ctx.strokeStyle = theme === 'paper' ? `rgba(230, 126, 34, ${alpha * 0.7})` : `rgba(0, 255, 204, ${alpha * 0.8})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 15 + radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

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
    ctx.fillText('CONTRAST INVERTER', centerX, my + 12);
    ctx.restore();

    // Draw Theme Mode labels
    ctx.save();
    ctx.font = 'bold 11px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    
    // Paper Label
    ctx.fillStyle = theme === 'paper' ? '#E67E22' : '#555';
    ctx.fillText('WARM PAPER', centerX, centerY - 45);

    // Neon Label
    ctx.fillStyle = theme === 'neon' ? '#00FFCC' : '#555';
    ctx.fillText('DARK NEON', centerX, centerY + 38);
    ctx.restore();

    // Switch casing slot
    const slotW = 20;
    const slotH = 55;
    ctx.save();
    ctx.fillStyle = theme === 'paper' ? '#E3D7C1' : '#0F1216';
    ctx.strokeStyle = theme === 'paper' ? '#C4B599' : '#333B44';
    ctx.lineWidth = 2;
    this.roundRect(ctx, centerX - slotW / 2, centerY - slotH / 2, slotW, slotH, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Switch lever arm
    const leverY = centerY + (this.state ? 16 : -16);
    ctx.save();
    ctx.strokeStyle = theme === 'paper' ? '#8C8578' : '#7F8C8D';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, leverY);
    ctx.stroke();

    // Lever knob top
    ctx.beginPath();
    ctx.arc(centerX, leverY, 10, 0, Math.PI * 2);
    if (theme === 'paper') {
      ctx.fillStyle = '#C0392B'; // Red knob
      ctx.strokeStyle = '#962D22';
    } else {
      ctx.fillStyle = '#00FFCC'; // Cyber neon knob
      ctx.strokeStyle = '#FFFFFF';
      ctx.shadowColor = '#00FFCC';
      ctx.shadowBlur = 8;
    }
    ctx.lineWidth = 2;
    ctx.fill();
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
    const centerY = my + mh / 2 + 10;

    // Expand click target box around slot
    if (x >= centerX - 25 && x <= centerX + 25 && y >= centerY - 35 && y <= centerY + 35) {
      this.toggle();
      return true;
    }
    return false;
  }



  private toggle() {
    this.state = !this.state;
    this.flipAnimTimer = 1.0;
    const nextTheme = this.state ? 'neon' : 'paper';
    this.game.setTheme(nextTheme);

    // Audio clack
    if (this.state) {
      this.audio.play('busyboard:toggle_on');
    } else {
      this.audio.play('busyboard:toggle_off');
    }
    this.haptics.vibrate(75);
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
