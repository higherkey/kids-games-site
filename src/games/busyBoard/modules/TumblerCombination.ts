import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class TumblerCombination extends BaseBusyBoardModule {
  private isDragging = false;
  private activeTumblerIdx = -1;
  private dragStartY = 0;
  private startTumblerOffset = 0;

  // Tumbler wheels: 3 columns. Each has 4 shape states (0=Triangle, 1=Circle, 2=Square, 3=Star)
  private tumblerAngles = [0, 0, 0]; // current raw rotation offsets
  private readonly shapes = ['▲', '●', '■', '★'];
  private readonly targetCombo = [3, 1, 3]; // ★, ●, ★
  private isUnlocked = false;

  constructor(id: string, x: number, y: number, w: number, h: number) {
    super(id, x, y, w, h);
  }

  public init(): void {
    // Start with random non-solved tumbler values
    this.tumblerAngles = [0.8, 2.5, 1.6];
  }



  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;
    const lockY = my + mh * 0.3;
    const tumblerY = my + mh * 0.7;

    // Faceplate - Brass/gold vault look
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;

    const faceGrad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
    faceGrad.addColorStop(0, '#E5A93C');
    faceGrad.addColorStop(1, '#966D20');
    ctx.fillStyle = faceGrad;

    ctx.strokeStyle = '#D4A343';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Rivets
    ctx.fillStyle = '#F4D068';
    ctx.beginPath();
    ctx.arc(mx + 15, my + 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + mw - 15, my + 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + 15, my + mh - 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + mw - 15, my + mh - 15, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Title
    ctx.fillStyle = '#FAF0D2';
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('VAULT COMBINATION', centerX, my + 15);
    ctx.restore();

    // --- DRAW PADLOCK (Top Area) ---
    ctx.save();
    ctx.translate(centerX, lockY);
    ctx.strokeStyle = '#CCD1D9';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    
    // Draw lock shackle
    ctx.beginPath();
    if (this.isUnlocked) {
      // Open shackle (offset and rotated slightly)
      ctx.arc(-8, -12, 14, Math.PI * 1.0, Math.PI * 2.0);
      ctx.lineTo(6, -2);
    } else {
      // Closed shackle
      ctx.arc(0, -5, 14, Math.PI * 1.0, Math.PI * 2.0);
      ctx.lineTo(14, 10);
      ctx.moveTo(-14, -5);
      ctx.lineTo(-14, 10);
    }
    ctx.stroke();

    // Lock body
    ctx.fillStyle = '#434A54';
    ctx.strokeStyle = '#373E47';
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, -22, 0, 44, 30, 6);
    ctx.fill();
    ctx.stroke();

    // Keyhole design
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 10, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-1.5, 10, 3, 8);
    ctx.restore();

    // --- DRAW 3 TUMBLER WHEELS (Bottom Area) ---
    ctx.save();
    const wheelW = 24;
    const wheelH = 45;
    const gap = 12;

    const startX = centerX - (wheelW * 1.5 + gap);

    for (let i = 0; i < 3; i++) {
      const wx = startX + i * (wheelW + gap);
      const wy = tumblerY - wheelH / 2;

      // Outer bezel casing slots
      ctx.fillStyle = '#22252A';
      ctx.strokeStyle = '#5E6672';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, wx - 1, wy - 1, wheelW + 2, wheelH + 2, 4);
      ctx.fill();
      ctx.stroke();

      // Draw scrolling tumbler cylinders
      ctx.save();
      // Clip rendering inside the tumbler slot
      this.roundRect(ctx, wx, wy, wheelW, wheelH, 3);
      ctx.clip();

      const angle = this.tumblerAngles[i];
      const slotStep = wheelH * 0.4; // pixel height between values

      // Draw shapes revolving around the cylinder
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // We render 3 shapes inside clip frame to simulate cylinder rolling
      for (let j = -2; j <= 2; j++) {
        // Calculate shape index based on angle offset
        const activeIdx = Math.round(angle);
        const shapeIdx = (activeIdx + j + 4000) % 4; // positive modulo
        const sy = tumblerY + j * slotStep - (angle - activeIdx) * slotStep;

        // Render shape
        ctx.fillStyle = this.isUnlocked ? '#00FFCC' : '#FFFFFF';
        ctx.fillText(this.shapes[shapeIdx], wx + wheelW / 2, sy);
      }
      ctx.restore();

      // Bezel highlight overlay lines
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + wheelW, wy);
      ctx.moveTo(wx, wy + wheelH);
      ctx.lineTo(wx + wheelW, wy + wheelH);
      ctx.stroke();
    }
    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    if (this.isUnlocked) return false;

    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;
    const tumblerY = my + mh * 0.7;

    const wheelW = 24;
    const wheelH = 45;
    const gap = 12;
    const startX = centerX - (wheelW * 1.5 + gap);

    // Identify which tumbler wheel was clicked
    for (let i = 0; i < 3; i++) {
      const wx = startX + i * (wheelW + gap);
      const wy = tumblerY - wheelH / 2;

      if (x >= wx - 5 && x <= wx + wheelW + 5 && y >= wy && y <= wy + wheelH) {
        this.isDragging = true;
        this.activeTumblerIdx = i;
        this.dragStartY = y;
        this.startTumblerOffset = this.tumblerAngles[i];
        this.haptics.lightTap();
        return true;
      }
    }
    return false;
  }

  public handlePointerMove(_x: number, y: number, _px: number, _py: number, _pw: number, _ph: number): void {
    if (!this.isDragging || this.activeTumblerIdx === -1) return;

    const wheelH = 45;
    const slotStep = wheelH * 0.4;

    const deltaY = y - this.dragStartY;
    // Map drag pixel offset to index rotation value
    const indexDelta = -deltaY / slotStep;

    const idx = this.activeTumblerIdx;
    const targetAngle = this.startTumblerOffset + indexDelta;

    if (Math.abs(targetAngle - this.tumblerAngles[idx]) > 0.05) {
      const lastIntVal = Math.round(this.tumblerAngles[idx]);
      this.tumblerAngles[idx] = targetAngle;
      const currentIntVal = Math.round(this.tumblerAngles[idx]);

      // Play soft mechanical tumbler ticks as user rotates cylinders
      if (lastIntVal !== currentIntVal) {
        this.audio.play('synth:click', 350 + (currentIntVal % 4) * 80);
        this.haptics.lightTap();
      }
    }
  }

  public handlePointerUp(): void {
    if (this.isDragging) {
      this.isDragging = false;

      // Snap the active tumbler wheel to the nearest integer index angle
      if (this.activeTumblerIdx !== -1) {
        const idx = this.activeTumblerIdx;
        this.tumblerAngles[idx] = Math.round(this.tumblerAngles[idx]);
        this.activeTumblerIdx = -1;
        this.audio.play('synth:click', 440);
        this.haptics.lightTap();

        // Check if combination is solved!
        this.checkCombination();
      }
    }
  }

  private checkCombination() {
    const code0 = (Math.round(this.tumblerAngles[0]) % 4 + 4) % 4;
    const code1 = (Math.round(this.tumblerAngles[1]) % 4 + 4) % 4;
    const code2 = (Math.round(this.tumblerAngles[2]) % 4 + 4) % 4;

    if (code0 === this.targetCombo[0] &&
        code1 === this.targetCombo[1] &&
        code2 === this.targetCombo[2]) {
      this.isUnlocked = true;
      // Play satisfying vault padlock release sounds!
      this.audio.play('busyboard:key_turn');
      setTimeout(() => {
        this.audio.play('busyboard:push_button', 250);
        this.haptics.vibrate(75);
      }, 150);
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
