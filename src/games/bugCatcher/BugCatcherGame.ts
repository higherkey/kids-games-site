import { BaseGame } from '../../core/BaseGame';

interface Bug {
  x: number;
  y: number;
  radius: number;
  caught: boolean;
  id: number;
}

/**
 * Nuko (Bug Catcher): Search-and-find hidden bug game.
 * Uses Z-index sprite layering and slow scanning mechanics to encourage focus.
 */
export class BugCatcherGame extends BaseGame {
  private bugs: Bug[] = [];
  private bugsCaught = 0;
  private readonly totalBugs = 4;
  private texturePhase = 0; // For animated natural texture background

  constructor() {
    super();
    this.audio.registerSound('catch', '/sounds/pop.ogg'); // Reuse pop for now
  }

  protected onInit(): void {
    this.createBugs();

    this.canvas?.addEventListener('touchstart', this.handleTouch);
    this.canvas?.addEventListener('mousedown', this.handleMouseDown);
  }

  private createBugs() {
    if (!this.canvas) return;

    this.bugs = [];
    this.bugsCaught = 0;

    // Generate 4 bugs at random positions
    for (let i = 0; i < this.totalBugs; i++) {
      const margin = 120;
      const x = margin + Math.random() * (this.canvas.width - margin * 2);
      const y = margin + Math.random() * (this.canvas.height - margin * 2);
      
      this.bugs.push({
        x,
        y,
        radius: 25,
        caught: false,
        id: i
      });
    }
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  private readonly handleTouch = (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    const pos = this.getCanvasPos(touch.clientX, touch.clientY);
    this.checkBugClick(pos.x, pos.y);
  };

  private readonly handleMouseDown = (e: MouseEvent) => {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.checkBugClick(pos.x, pos.y);
  };

  private checkBugClick(x: number, y: number) {
    // Check if click is on any uncaught bug (iterate from last to first for top-down)
    for (let i = this.bugs.length - 1; i >= 0; i--) {
      const bug = this.bugs[i];
      if (!bug.caught) {
        const dist = Math.hypot((x - bug.x), (y - bug.y));
        if (dist < bug.radius) {
          bug.caught = true;
          this.bugsCaught++;
          this.audio.play('catch');
          this.haptics.lightTap();
          break; // Only catch one bug per click
        }
      }
    }
  }

  update(dt: number): void {
    this.texturePhase += dt * 0.0001; // Slow animation
    this.render();
  }

  private drawWoolTexture(x: number, y: number, w: number, h: number) {
    if (!this.ctx) return;

    // Draw natural wool-like stone texture using multiple noise layers
    const imageData = this.ctx.createImageData(w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Simplex-inspired noise (simplified)
      const px = (i / 4) % w;
      const py = Math.floor((i / 4) / w);
      
      // Create organic noise pattern
      const noise = Math.sin(px * 0.05 + this.texturePhase) * Math.cos(py * 0.05) * 30 + 50;
      const base = 140 + noise; // Sage green-ish base
      
      data[i] = base * 0.7; // R
      data[i + 1] = base * 0.9; // G
      data[i + 2] = base * 0.8; // B
      data[i + 3] = 255; // A
    }

    this.ctx.putImageData(imageData, x, y);
  }

  private render() {
    if (!this.ctx || !this.canvas) return;

    // Draw natural textured background (stone/wool)
    this.drawWoolTexture(0, 0, this.canvas.width, this.canvas.height);

    // Draw some variation by adding darker patches
    this.ctx.fillStyle = 'rgba(100, 120, 100, 0.15)';
    for (let i = 0; i < 8; i++) {
      const x = Math.sin(i * 0.7 + this.texturePhase * 0.5) * this.canvas.width * 0.4 + this.canvas.width * 0.5;
      const y = Math.cos(i * 0.9 + this.texturePhase * 0.3) * this.canvas.height * 0.4 + this.canvas.height * 0.5;
      this.ctx.fillRect(x - 50, y - 50, 100, 100);
    }

    // Draw bugs (caught ones are more transparent/visible, uncaught are camouflaged)
    this.bugs.forEach((bug) => {
      if (bug.caught) {
        // Caught bug glows and shrinks slightly
        this.ctx!.fillStyle = '#4ECDC4';
        this.ctx!.globalAlpha = 0.6;
      } else {
        // Uncaught bug is subtle, natural colors (blend with background)
        this.ctx!.fillStyle = '#8B9D6F';
        this.ctx!.globalAlpha = 0.7;
      }

      // Draw bug body (simple oval)
      this.ctx!.beginPath();
      this.ctx!.ellipse(bug.x, bug.y, bug.radius, bug.radius * 0.8, 0, 0, Math.PI * 2);
      this.ctx!.fill();

      // Draw antenna
      this.ctx!.strokeStyle = '#5A6B4F';
      this.ctx!.lineWidth = 2;
      this.ctx!.globalAlpha = 0.8;
      this.ctx!.beginPath();
      this.ctx!.moveTo(bug.x - bug.radius * 0.3, bug.y - bug.radius * 0.5);
      this.ctx!.lineTo(bug.x - bug.radius * 0.5, bug.y - bug.radius * 1.0);
      this.ctx!.stroke();

      this.ctx!.beginPath();
      this.ctx!.moveTo(bug.x + bug.radius * 0.3, bug.y - bug.radius * 0.5);
      this.ctx!.lineTo(bug.x + bug.radius * 0.5, bug.y - bug.radius * 1.0);
      this.ctx!.stroke();

      // Draw simple legs
      this.ctx!.lineWidth = 1.5;
      for (let j = 0; j < 3; j++) {
        const side = j < 1.5 ? -1 : 1;
        this.ctx!.beginPath();
        this.ctx!.moveTo(bug.x + side * bug.radius * 0.3, bug.y + bug.radius * 0.2);
        this.ctx!.lineTo(bug.x + side * bug.radius * 0.6, bug.y + bug.radius * 0.5);
        this.ctx!.stroke();
      }

      this.ctx!.globalAlpha = 1.0;
    });

    // Draw HUD: instruction and bug count
    this.ctx.fillStyle = '#2B2D5E';
    this.ctx.font = '18px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('Find the hidden bugs!', this.canvas.width / 2, 40);

    // Bug counter
    this.ctx.font = 'bold 20px Fredoka, sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`${this.bugsCaught} / ${this.totalBugs}`, this.canvas.width - 30, 40);

    // Win screen
    if (this.bugsCaught === this.totalBugs) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 48px Fredoka, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('All bugs found!', this.canvas.width / 2, this.canvas.height / 2);

      this.ctx.font = '20px Fredoka, sans-serif';
      this.ctx.fillText('Great focus!', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }
  }



  destroy(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('touchstart', this.handleTouch);
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    }
  }
}
