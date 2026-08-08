import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class AudioJack35mm extends BaseBusyBoardModule {
  private isPluggedIn = false;
  private isDragging = false;
  private plugX = 0;
  private plugY = 0;
  private initialSetupDone = false;
  private soundWaveAngle = 0;
  private loopInterval: any = null;

  constructor(id: string, x: number, y: number, w: number, h: number) {
    super(id, x, y, w, h);
  }

  private startLoop() {
    if (this.loopInterval) return;
    const melody = ['c4', 'e4', 'g4', 'c5', 'g4', 'e4'];
    let index = 0;
    this.loopInterval = setInterval(() => {
      if (this.isPluggedIn) {
        this.audio.play('synth:pluck', melody[index]);
        index = (index + 1) % melody.length;
      }
    }, 450);
  }

  private stopLoop() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }



  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;
    const socketY = my + mh * 0.35;

    if (!this.initialSetupDone) {
      this.plugX = centerX;
      this.plugY = my + mh * 0.75;
      this.initialSetupDone = true;
    }

    // Faceplate - Brushed slate look
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;

    const faceGrad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
    faceGrad.addColorStop(0, '#363C46');
    faceGrad.addColorStop(1, '#22262C');
    ctx.fillStyle = faceGrad;

    ctx.strokeStyle = '#5E6672';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Rivets
    ctx.fillStyle = '#9FA4AD';
    ctx.beginPath();
    ctx.arc(mx + 15, my + 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + mw - 15, my + 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + 15, my + mh - 15, 3.5, 0, Math.PI * 2);
    ctx.arc(mx + mw - 15, my + mh - 15, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Title
    ctx.fillStyle = '#CFD3DB';
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('3.5MM AUDIO JACK', centerX, my + 15);
    ctx.restore();

    // --- DRAW SOCKET ---
    ctx.save();
    // Inner socket metallic circle
    const socketR = 18;
    const socketGrad = ctx.createRadialGradient(centerX, socketY, 2, centerX, socketY, socketR);
    socketGrad.addColorStop(0, '#000000');
    socketGrad.addColorStop(0.6, '#3A3D40');
    socketGrad.addColorStop(0.8, '#7F8C8D');
    socketGrad.addColorStop(1, '#3E4142');
    ctx.fillStyle = socketGrad;
    ctx.beginPath();
    ctx.arc(centerX, socketY, socketR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#95A5A6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(centerX, socketY, socketR - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // --- DRAW ANIMATED AUDIO WAVES ---
    if (this.isPluggedIn) {
      this.soundWaveAngle += 0.08;
      ctx.save();
      ctx.strokeStyle = '#3498DB';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';

      // 3 expanding audio waves on left and right sides
      const timeMs = Date.now();
      for (let i = 0; i < 3; i++) {
        const waveDist = 28 + ((timeMs / 18 + i * 22) % 60);
        const opacity = Math.max(0, 1 - (waveDist - 28) / 60);
        ctx.strokeStyle = `rgba(52, 152, 219, ${opacity})`;

        // Left wave arc
        ctx.beginPath();
        ctx.arc(centerX, socketY, waveDist, Math.PI * 0.75, Math.PI * 1.25);
        ctx.stroke();

        // Right wave arc
        ctx.beginPath();
        ctx.arc(centerX, socketY, waveDist, -Math.PI * 0.25, Math.PI * 0.25);
        ctx.stroke();
      }
      ctx.restore();
    }

    // --- DRAW COILED SPRING CORD ---
    const cordStartX = centerX;
    const cordStartY = my + mh - 5;
    const currentPlugX = this.isPluggedIn ? centerX : this.plugX;
    const currentPlugY = this.isPluggedIn ? socketY + 8 : this.plugY;

    ctx.save();
    ctx.strokeStyle = '#2B3E50';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cordStartX, cordStartY);

    const steps = 60;
    const dx = currentPlugX - cordStartX;
    const dy = currentPlugY - cordStartY;
    const distance = Math.hypot(dx, dy);

    if (distance > 10) {
      const angle = Math.atan2(dy, dx);
      const perpAngle = angle + Math.PI / 2;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Interpolated position along path
        const lx = cordStartX + dx * t;
        const ly = cordStartY + dy * t;

        // Coil size adjusts so it stretches out when pulled
        const coilW = Math.max(3, 14 - (distance / mw) * 8);
        const cycle = t * Math.PI * 26; // number of spiral loops
        const offset = Math.sin(cycle) * coilW;

        const pxOffset = Math.cos(perpAngle) * offset;
        const pyOffset = Math.sin(perpAngle) * offset;

        ctx.lineTo(lx + pxOffset, ly + pyOffset);
      }
    } else {
      ctx.lineTo(currentPlugX, currentPlugY);
    }
    ctx.stroke();
    ctx.restore();

    // --- DRAW MALE AUX PLUG ---
    if (!this.isPluggedIn) {
      ctx.save();
      // Drop shadow for aux jack
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 3;

      // Draw shiny golden pin (Tip, Ring, Sleeve) extending upward
      const pinX = currentPlugX;
      const pinY = currentPlugY - 12; // starting offset of pin tip

      // Metallic gold gradient
      const pinGrad = ctx.createLinearGradient(pinX - 3, pinY, pinX + 3, pinY);
      pinGrad.addColorStop(0, '#FFE082');
      pinGrad.addColorStop(0.5, '#FFF8E1');
      pinGrad.addColorStop(1, '#FFB300');
      ctx.fillStyle = pinGrad;

      // Tip shape
      ctx.beginPath();
      ctx.moveTo(pinX - 2.5, pinY - 14);
      ctx.lineTo(pinX + 2.5, pinY - 14);
      ctx.lineTo(pinX + 3, pinY - 10);
      ctx.lineTo(pinX + 1.5, pinY - 8);
      ctx.lineTo(pinX - 1.5, pinY - 8);
      ctx.lineTo(pinX - 3, pinY - 10);
      ctx.closePath();
      ctx.fill();

      // Black insulator band
      ctx.fillStyle = '#000000';
      ctx.fillRect(pinX - 2.5, pinY - 8, 5, 2);

      // Ring section
      ctx.fillStyle = pinGrad;
      ctx.fillRect(pinX - 3, pinY - 6, 6, 5);

      // Black insulator band 2
      ctx.fillStyle = '#000000';
      ctx.fillRect(pinX - 2.5, pinY - 1, 5, 2);

      // Sleeve section
      ctx.fillStyle = pinGrad;
      ctx.fillRect(pinX - 3, pinY + 1, 6, 11);

      // Aux Plug Handle grip body (Metal cylinder with knurling)
      ctx.shadowColor = 'transparent';
      const handleGrad = ctx.createLinearGradient(currentPlugX - 7, currentPlugY, currentPlugX + 7, currentPlugY);
      handleGrad.addColorStop(0, '#5A606B');
      handleGrad.addColorStop(0.4, '#B0B5BF');
      handleGrad.addColorStop(0.6, '#FFFFFF');
      handleGrad.addColorStop(1, '#3A3F47');
      ctx.fillStyle = handleGrad;
      ctx.strokeStyle = '#2C3E50';
      ctx.lineWidth = 1.5;

      this.roundRect(ctx, currentPlugX - 7, currentPlugY + 12, 14, 25, 3);
      ctx.fill();
      ctx.stroke();

      // Knurling grid lines
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      for (let gy = currentPlugY + 16; gy < currentPlugY + 34; gy += 4) {
        ctx.beginPath();
        ctx.moveTo(currentPlugX - 7, gy);
        ctx.lineTo(currentPlugX + 7, gy);
        ctx.stroke();
      }

      // Strain relief rubber bottom
      ctx.fillStyle = '#11141A';
      ctx.fillRect(currentPlugX - 4, currentPlugY + 37, 8, 8);

      ctx.restore();
    } else {
      // Plug is inserted! Only handle body shows, overlapping socket
      ctx.save();
      const handleGrad = ctx.createLinearGradient(currentPlugX - 7, currentPlugY, currentPlugX + 7, currentPlugY);
      handleGrad.addColorStop(0, '#3E4249');
      handleGrad.addColorStop(0.5, '#9AA0AC');
      handleGrad.addColorStop(1, '#2E3136');
      ctx.fillStyle = handleGrad;
      ctx.strokeStyle = '#1E2024';
      ctx.lineWidth = 1.5;

      this.roundRect(ctx, currentPlugX - 7, currentPlugY, 14, 22, 3);
      ctx.fill();
      ctx.stroke();

      // Strain relief rubber bottom
      ctx.fillStyle = '#11141A';
      ctx.fillRect(currentPlugX - 4, currentPlugY + 22, 8, 8);
      ctx.restore();
    }
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const centerX = mx + mw / 2;
    const socketY = my + mh * 0.35;
    const currentPlugX = this.isPluggedIn ? centerX : this.plugX;
    const currentPlugY = this.isPluggedIn ? socketY + 8 : this.plugY;

    // Expand click radius slightly for small mobile hits
    const clickDist = Math.hypot(x - currentPlugX, y - (currentPlugY + (this.isPluggedIn ? 10 : 20)));

    if (clickDist <= 30) {
      if (this.isPluggedIn) {
        this.isPluggedIn = false;
        this.plugX = x;
        this.plugY = y;
        this.audio.play('synth:click', 250); // Unplug crackle
        this.haptics.lightTap();
        this.stopLoop();
      }
      this.isDragging = true;
      return true;
    }

    return false;
  }

  public handlePointerMove(x: number, y: number, px: number, py: number, pw: number, ph: number): void {
    if (!this.isDragging) return;

    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    this.plugX = Math.max(mx + 15, Math.min(mx + mw - 15, x));
    this.plugY = Math.max(my + 15, Math.min(my + mh - 15, y));

    const centerX = mx + mw / 2;
    const socketY = my + mh * 0.35;
    const distToSocket = Math.hypot(this.plugX - centerX, this.plugY - (socketY + 8));

    if (distToSocket < 20) {
      this.isPluggedIn = true;
      this.isDragging = false;

      // Play high-fidelity stereo audio connection chime
      this.audio.play('synth:chime', 523.25); // C5 Chime
      setTimeout(() => {
        if (this.isPluggedIn) {
          this.audio.play('synth:chime', 659.25); // E5 Chime
        }
      }, 100);
      setTimeout(() => {
        if (this.isPluggedIn) {
          this.audio.play('synth:chime', 783.99); // G5 Chime
        }
      }, 200);

      this.haptics.success();
      this.startLoop();
    }
  }

  public handlePointerUp(): void {
    this.isDragging = false;
  }

  public destroy(): void {
    this.stopLoop();
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
