import { BaseGame } from '../../core/BaseGame';

interface Bubble {
  x: number;
  y: number;
  radius: number;
  popped: boolean;
}

export class BubbleWrapGame extends BaseGame {
  private bubbles: Bubble[] = [];

  constructor() {
    super();
    this.audio.registerSound('pop', '/sounds/pop.ogg');
  }

  protected onInit(): void {
    this.createGrid();

    this.canvas?.addEventListener('touchstart', this.handleTouch);
    this.canvas?.addEventListener('mousedown', this.handleMouseDown);
  }

  private createGrid() {
    if (!this.canvas) return;
    const padding = 60;
    const spacing = 100;
    const cols = Math.floor((this.canvas.width - padding) / spacing);
    const rows = Math.floor((this.canvas.height - padding) / spacing);

    this.bubbles = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.bubbles.push({
          x: padding + c * spacing + spacing / 2,
          y: padding + r * spacing + spacing / 2,
          radius: 40,
          popped: false
        });
      }
    }
  }

  private readonly handleTouch = (e: TouchEvent) => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    Array.from(e.changedTouches).forEach(touch => {
      this.checkPop(touch.clientX - rect.left, touch.clientY - rect.top);
    });
  }

  private readonly handleMouseDown = (e: MouseEvent) => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.checkPop(e.clientX - rect.left, e.clientY - rect.top);
  }

  private checkPop(x: number, y: number) {
    this.bubbles.forEach(bubble => {
      if (!bubble.popped) {
        const dist = Math.hypot((x - bubble.x), (y - bubble.y));
        if (dist < bubble.radius) {
          bubble.popped = true;
          this.audio.play('pop');
          this.haptics.lightTap();
        }
      }
    });
  }

  update(_dt: number): void {
    this.render();
  }

  private render() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.bubbles.forEach(bubble => {
      this.ctx!.beginPath();
      this.ctx!.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      
      if (bubble.popped) {
        this.ctx!.strokeStyle = 'rgba(47, 48, 97, 0.2)';
        this.ctx!.lineWidth = 2;
        this.ctx!.stroke();
      } else {
        // Bubble gradient
        const grad = this.ctx!.createRadialGradient(
          bubble.x - bubble.radius/3, bubble.y - bubble.radius/3, bubble.radius/10,
          bubble.x, bubble.y, bubble.radius
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, '#4ECDC4');
        
        this.ctx!.fillStyle = grad;
        this.ctx!.fill();
        this.ctx!.strokeStyle = 'rgba(47, 48, 97, 0.5)';
        this.ctx!.lineWidth = 3;
        this.ctx!.stroke();
      }
    });
  }



  destroy(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('touchstart', this.handleTouch);
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    }
  }
}
