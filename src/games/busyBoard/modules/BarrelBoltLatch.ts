import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class BarrelBoltLatch extends BaseBusyBoardModule {
  private isDragging = false;
  private boltX = 15; // relative offset (min 15, max 95)
  private readonly maxBoltX = 95;
  private isUnlocked = false;

  constructor(id: string, x: number, y: number, w: number, h: number) {
    super(id, x, y, w, h);
  }

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;
    const centerY = my + mh / 2 + 10;

    // Faceplate - Metallic bronze/gold sheet
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;

    const faceGrad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
    faceGrad.addColorStop(0, '#8E806A');
    faceGrad.addColorStop(1, '#534B3C');
    ctx.fillStyle = faceGrad;

    ctx.strokeStyle = '#A79983';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Rivets
    ctx.fillStyle = '#C4B59E';
    ctx.beginPath();
    ctx.arc(mx + 15, my + 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + mw - 15, my + 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + 15, my + mh - 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + mw - 15, my + mh - 15, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Title
    ctx.fillStyle = '#EBE3D5';
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('BARREL BOLT LATCH', centerX, my + 15);
    ctx.restore();

    // Hidden Window (Behind latch)
    ctx.save();
    const winW = mw - 50;
    const winH = 45;
    const winX = centerX - winW / 2;
    const winY = centerY - winH / 2;
    
    // Draw background wood slot
    ctx.fillStyle = '#3E2723'; // Dark brown cavity
    this.roundRect(ctx, winX, winY, winW, winH, 8);
    ctx.fill();

    // Draw animal face (revealed when unlocked/slid to right)
    const animalOpacity = (this.boltX - 15) / (this.maxBoltX - 15);
    if (animalOpacity > 0.05) {
      ctx.globalAlpha = animalOpacity;
      // Draw cute cat face
      ctx.fillStyle = '#FF9800';
      ctx.beginPath();
      // Ears
      ctx.moveTo(centerX - 15, centerY - 5);
      ctx.lineTo(centerX - 20, centerY - 18);
      ctx.lineTo(centerX - 8, centerY - 10);
      ctx.moveTo(centerX + 15, centerY - 5);
      ctx.lineTo(centerX + 20, centerY - 18);
      ctx.lineTo(centerX + 8, centerY - 10);
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.arc(centerX, centerY - 2, 14, 0, Math.PI * 2);
      ctx.fill();
      // Eyes & nose
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(centerX - 5, centerY - 4, 2, 0, Math.PI * 2);
      ctx.arc(centerX + 5, centerY - 4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FF5722';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Latch slide guides (metallic brackets holding the sliding bolt)
    ctx.save();
    ctx.fillStyle = '#7F8C8D';
    ctx.strokeStyle = '#3E4647';
    ctx.lineWidth = 1.5;

    const guideY = centerY - 12;
    // Left guide bracket
    this.roundRect(ctx, winX + 10, guideY, 14, 24, 3);
    ctx.fill(); ctx.stroke();
    // Right guide bracket
    this.roundRect(ctx, winX + winW - 24, guideY, 14, 24, 3);
    ctx.fill(); ctx.stroke();

    // Sliding metal bolt shaft
    const boltW = 55;
    const boltH = 14;
    const currentBoltX = winX + this.boltX;
    
    ctx.fillStyle = '#CCD1D9';
    ctx.strokeStyle = '#656D78';
    ctx.lineWidth = 2;
    this.roundRect(ctx, currentBoltX, centerY - boltH / 2, boltW, boltH, 4);
    ctx.fill();
    ctx.stroke();

    // Bolt knob (for dragging)
    const knobR = 9;
    const knobX = currentBoltX + 12;
    const knobY = centerY;
    ctx.beginPath();
    ctx.arc(knobX, knobY, knobR, 0, Math.PI * 2);
    ctx.fillStyle = '#AAB2BD';
    ctx.strokeStyle = '#434A54';
    ctx.lineWidth = 2.5;
    ctx.fill();
    ctx.stroke();

    // Ridge lines on handle knob
    ctx.strokeStyle = '#434A54';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(knobX - 4, knobY - 3);
    ctx.lineTo(knobX - 4, knobY + 3);
    ctx.moveTo(knobX, knobY - 4);
    ctx.lineTo(knobX, knobY + 4);
    ctx.moveTo(knobX + 4, knobY - 3);
    ctx.lineTo(knobX + 4, knobY + 3);
    ctx.stroke();

    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;
    const centerY = my + mh / 2 + 10;

    const winW = mw - 50;
    const winX = centerX - winW / 2;

    const currentBoltX = winX + this.boltX;
    const knobX = currentBoltX + 12;

    // Check hit on bolt knob
    const dx = x - knobX;
    const dy = y - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist <= 25) {
      this.isDragging = true;
      this.haptics.lightTap();
      return true;
    }
    return false;
  }

  public handlePointerMove(x: number, _y: number, px: number, _py: number, pw: number, _ph: number): void {
    if (!this.isDragging) return;

    const margin = 10;
    const mx = px + margin;
    const mw = pw - margin * 2;

    const centerX = mx + mw / 2;
    const winW = mw - 50;
    const winX = centerX - winW / 2;

    // Calculate relative bolt X based on drag pointer
    let relX = x - winX - 12;
    relX = Math.max(15, Math.min(this.maxBoltX, relX));
    
    if (Math.abs(relX - this.boltX) > 2) {
      this.boltX = relX;
      // Play scratch sound periodically
      if (Math.random() < 0.15) {
        this.audio.play('synth:click', 280);
      }
      this.haptics.lightTap();
    }

    // Trigger lock sound if reached max left or right
    if (this.boltX === this.maxBoltX && !this.isUnlocked) {
      this.isUnlocked = true;
      this.audio.play('busyboard:key_turn');
      this.haptics.vibrate(75);
    } else if (this.boltX === 15 && this.isUnlocked) {
      this.isUnlocked = false;
      this.audio.play('busyboard:push_button');
      this.haptics.vibrate(75);
    }
  }

  public handlePointerUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
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
