import { BaseBusyBoardModule } from './BaseBusyBoardModule';

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export class IndustrialToggle extends BaseBusyBoardModule {
  private isOn = false;
  private hasPower = true;
  private readonly onToggleCallback?: (state: boolean) => void;

  // Particle sparks
  private readonly sparks: Spark[] = [];
  
  // Dragging state
  private isDragging = false;
  private dragStartY = 0;
  private currentLeverOffset = 0; // -1 to 1 representing toggle position

  constructor(id: string, x: number, y: number, w: number, h: number, onToggle?: (state: boolean) => void) {
    super(id, x, y, w, h);
    this.onToggleCallback = onToggle;
    this.currentLeverOffset = this.isOn ? 1 : -1;
  }

  public setPowerState(hasPower: boolean): void {
    this.hasPower = hasPower;
  }

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    // Margin for spacing
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    // Draw module background / metal plate with rivets
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;

    // Brushed metal grey background
    ctx.fillStyle = '#CCCCCC'; 
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();
    
    // Draw 4 corner rivets
    ctx.fillStyle = '#999999';
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    const rivetOffset = 15;
    const rivetRadius = 4;
    const corners = [
      [mx + rivetOffset, my + rivetOffset],
      [mx + mw - rivetOffset, my + rivetOffset],
      [mx + rivetOffset, my + mh - rivetOffset],
      [mx + mw - rivetOffset, my + mh - rivetOffset]
    ];
    corners.forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(rx, ry, rivetRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Draw Label/Title
    ctx.fillStyle = '#222222';
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('INDUSTRIAL TOGGLE', mx + mw / 2, my + 25);
    ctx.restore();

    // Draw metallic bezel center ring
    const centerX = mx + mw / 2;
    const centerY = my + mh / 2 + 10;
    const bezelRadius = Math.min(mw, mh) * 0.22;

    ctx.save();
    const bezelGrad = ctx.createRadialGradient(centerX, centerY, bezelRadius * 0.8, centerX, centerY, bezelRadius);
    bezelGrad.addColorStop(0, '#555555');
    bezelGrad.addColorStop(0.5, '#BBBBBB');
    bezelGrad.addColorStop(1, '#333333');
    ctx.fillStyle = bezelGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, bezelRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Dark slit in the middle
    const slitW = bezelRadius * 0.4;
    const slitH = bezelRadius * 1.3;
    ctx.fillStyle = '#111111';
    ctx.fillRect(centerX - slitW / 2, centerY - slitH / 2, slitW, slitH);

    // Lever math interpolation
    if (!this.isDragging) {
      const targetOffset = this.isOn ? 1 : -1;
      this.currentLeverOffset += (targetOffset - this.currentLeverOffset) * 0.3;
    }

    // Draw the lever shaft
    const leverLength = bezelRadius * 1.8;
    const leverAngle = this.currentLeverOffset * (Math.PI / 6); // Up to 30 degrees tilt
    const endX = centerX + Math.sin(leverAngle) * 5; // slight visual offset
    const endY = centerY + this.currentLeverOffset * leverLength;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = '#D4AF37'; // Brass rod
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw red handle tip ball
    const tipRadius = 14;
    const tipGrad = ctx.createRadialGradient(endX - 3, endY - 3, 2, endX, endY, tipRadius);
    tipGrad.addColorStop(0, '#FF8E8E');
    tipGrad.addColorStop(0.5, '#FF3B30');
    tipGrad.addColorStop(1, '#8B0000');
    ctx.fillStyle = tipGrad;
    ctx.beginPath();
    ctx.arc(endX, endY, tipRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Update and draw sparks
    this.updateSparks(mx, my, mw, mh);
    this.drawSparks(ctx);
  }

  private triggerSparks(x: number, y: number) {
    if (!this.hasPower) return;
    const sparkCount = 20 + Math.floor(Math.random() * 15);
    const colors = ['#FFD700', '#FF8C00', '#FF4500', '#FFFFFF', '#4ECDC4'];
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 1, // subtle gravity downward
        life: 0,
        maxLife: 30 + Math.floor(Math.random() * 30),
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  private updateSparks(mx: number, my: number, mw: number, mh: number) {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.15; // Gravity
      s.life++;

      // Keep within bounds
      if (s.life >= s.maxLife || s.x < mx || s.x > mx + mw || s.y > my + mh) {
        this.sparks.splice(i, 1);
      }
    }
  }

  private drawSparks(ctx: CanvasRenderingContext2D) {
    ctx.save();
    this.sparks.forEach(s => {
      const alpha = 1 - s.life / s.maxLife;
      ctx.fillStyle = s.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 6;
      
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    });
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
    const bezelRadius = Math.min(mw, mh) * 0.22;
    const clickRadius = bezelRadius * 2.5;

    // Check distance to handle click/drag
    const dist = Math.hypot((x - centerX), (y - centerY));
    if (dist < clickRadius) {
      this.isDragging = true;
      this.dragStartY = y;
      return true;
    }

    return false;
  }

  public handlePointerMove(_x: number, y: number, _px: number, py: number, pw: number, ph: number): void {
    if (!this.isDragging) return;

    const margin = 10;
    const my = py + margin;
    const mh = ph - margin * 2;
    const centerY = my + mh / 2 + 10;

    const deltaY = y - centerY;
    const scale = Math.min(pw, ph) * 0.22 * 1.8; // scale by lever length
    
    // Set relative offset between -1 and 1
    let offset = deltaY / scale;
    offset = Math.max(-1, Math.min(1, offset));
    this.currentLeverOffset = offset;
  }

  public handlePointerUp(_x: number, _y: number, px: number, py: number, pw: number, ph: number): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    // Determine final state based on lever offset
    const newState = this.currentLeverOffset > 0;
    
    if (newState !== this.isOn) {
      this.isOn = newState;
      
      // Feedback: Thud / drum sound
      this.audio.play(this.isOn ? 'busyboard:toggle_on' : 'busyboard:toggle_off');
      this.haptics.heavyImpact();

      // Trigger spark coordinates at the center socket
      const margin = 10;
      const mx = px + margin;
      const my = py + margin;
      const mw = pw - margin * 2;
      const mh = ph - margin * 2;
      const centerX = mx + mw / 2;
      const centerY = my + mh / 2 + 10;
      this.triggerSparks(centerX, centerY);

      if (this.onToggleCallback) {
        this.onToggleCallback(this.isOn);
      }
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
