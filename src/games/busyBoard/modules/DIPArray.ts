import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class DIPArray extends BaseBusyBoardModule {
  private switches: boolean[] = new Array(8).fill(false);
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

    // DIP Package base (solid dark blue plastic)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#1A365D'; // Royal Navy Blue
    ctx.strokeStyle = '#0F2340';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Module Title
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('8-BIT DIP ARRAY', mx + mw / 2, my + 12);
    ctx.restore();

    // Draw the "Dashboard Display" screen
    const dbW = mw * 0.8;
    const dbH = mh * 0.18;
    const dbX = mx + (mw - dbW) / 2;
    const dbY = my + 30;

    ctx.save();
    ctx.fillStyle = '#0D1B2A'; // Screen background
    ctx.strokeStyle = '#415A77';
    ctx.lineWidth = 2;
    this.roundRect(ctx, dbX, dbY, dbW, dbH, 6);
    ctx.fill();
    ctx.stroke();

    // Screen readout (8 segment blocks + decimal output)
    if (this.hasPower) {
      const segW = (dbW - 18) / 8;
      let binaryVal = 0;

      for (let i = 0; i < 8; i++) {
        const segX = dbX + 5 + i * (segW + 1.2);
        const segY = dbY + 4;
        const segH = dbH - 8;

        if (this.switches[i]) {
          binaryVal += Math.pow(2, 7 - i);
          ctx.fillStyle = '#4ECDC4'; // Glowing cyan segment
          ctx.shadowColor = '#4ECDC4';
          ctx.shadowBlur = 4;
        } else {
          ctx.fillStyle = '#1B263B'; // Dim unlit segment
        }
        ctx.fillRect(segX, segY, segW, segH);
        ctx.shadowColor = 'transparent';
      }

      // Render the decimal sum text in the corner of screen
      ctx.fillStyle = '#4ECDC4';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`VAL: ${binaryVal}`, dbX + dbW - 8, dbY + dbH - 12);
    } else {
      // Screen dead
      ctx.fillStyle = '#151515';
      ctx.fillRect(dbX + 1, dbY + 1, dbW - 2, dbH - 2);
    }
    ctx.restore();

    // Draw the 8 switches area
    const dipW = mw * 0.85;
    const dipH = mh * 0.45;
    const dipX = mx + (mw - dipW) / 2;
    const dipY = dbY + dbH + 15;

    // DIP Housing red background
    ctx.fillStyle = '#C53030'; // Red DIP switch block
    ctx.strokeStyle = '#742A2A';
    ctx.lineWidth = 2;
    this.roundRect(ctx, dipX, dipY, dipW, dipH, 8);
    ctx.fill();
    ctx.stroke();

    // Individual switches
    const switchSlotW = (dipW - 20) / 8;
    const switchSlotH = dipH * 0.7;

    for (let i = 0; i < 8; i++) {
      const slotX = dipX + 10 + i * (switchSlotW + 1);
      const slotY = dipY + (dipH - switchSlotH) / 2;

      // Draw slot track
      ctx.fillStyle = '#4A1D1D'; // Inside track
      ctx.fillRect(slotX, slotY, switchSlotW - 2, switchSlotH);

      // Draw slider peg
      const pegW = switchSlotW - 4;
      const pegH = switchSlotH * 0.4;
      const isSwitchOn = this.switches[i];
      // On = up, Off = down
      const pegY = isSwitchOn ? slotY + 2 : slotY + switchSlotH - pegH - 2;

      ctx.save();
      // White plastic peg
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 3;
      this.roundRect(ctx, slotX + 1, pegY, pegW, pegH, 2);
      ctx.fill();

      // Peg center stripe
      ctx.fillStyle = '#C53030';
      ctx.fillRect(slotX + 3, pegY + pegH / 2 - 1, pegW - 4, 2);

      // Draw index number below
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '9px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((i + 1).toString(), slotX + switchSlotW / 2, slotY + switchSlotH + 2);
      ctx.restore();
    }
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const dbH = mh * 0.18;
    const dbY = my + 30;
    
    const dipW = mw * 0.85;
    const dipH = mh * 0.45;
    const dipX = mx + (mw - dipW) / 2;
    const dipY = dbY + dbH + 15;

    const switchSlotW = (dipW - 20) / 8;
    const switchSlotH = dipH * 0.7;
    const slotY = dipY + (dipH - switchSlotH) / 2;

    // Check hit coordinates
    if (x >= dipX + 10 && x <= dipX + dipW - 10 && y >= slotY && y <= slotY + switchSlotH) {
      const clickedIdx = Math.floor((x - (dipX + 10)) / (switchSlotW + 1));
      if (clickedIdx >= 0 && clickedIdx < 8) {
        this.switches[clickedIdx] = !this.switches[clickedIdx];
        
        // High pitch clean click sound + raising 8bit synth note
        this.audio.play('busyboard:dip');
        this.audio.play('synth:click', 250 + clickedIdx * 90);
        this.haptics.lightTap();
        return true;
      }
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
