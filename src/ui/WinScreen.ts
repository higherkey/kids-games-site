import { AudioController } from '../core/AudioController';
import { HapticController } from '../core/HapticController';
import './WinScreen.css';

export class WinScreen {
  private static overlay: HTMLDivElement | null = null;
  private static canvas: HTMLCanvasElement | null = null;
  private static ctx: CanvasRenderingContext2D | null = null;
  private static particles: any[] = [];
  private static animationFrameId: number | null = null;

  public static show(onRestart?: () => void, onHome?: () => void) {
    if (this.overlay) return;

    // Trigger success feedback
    AudioController.getInstance().play('synth:bell', 'C5');
    setTimeout(() => AudioController.getInstance().play('synth:chime', 'E5'), 150);
    setTimeout(() => AudioController.getInstance().play('synth:chime', 'G5'), 300);
    setTimeout(() => AudioController.getInstance().play('synth:bell', 'C6'), 450);
    
    HapticController.getInstance().success();

    // Create DOM Overlay
    const overlay = document.createElement('div');
    overlay.id = 'win-screen-overlay';
    overlay.className = 'win-screen-overlay';
    
    overlay.innerHTML = `
      <div class="win-card">
        <div class="star-burst">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="#FFD93D" stroke="#FB923C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
        <h2>You Did It!</h2>
        <p>Wonderful job playing the game!</p>
        <div class="win-actions">
          <button id="win-btn-replay" class="win-btn win-btn-primary" aria-label="Play Again">Play Again</button>
          <button id="win-btn-home" class="win-btn win-btn-secondary" aria-label="Go Home">Go Home</button>
        </div>
      </div>
      <canvas id="confetti-canvas" class="confetti-canvas"></canvas>
    `;

    document.getElementById('app')?.appendChild(overlay);
    this.overlay = overlay;

    // Setup action buttons
    const replayBtn = overlay.querySelector('#win-btn-replay');
    const homeBtn = overlay.querySelector('#win-btn-home');

    replayBtn?.addEventListener('click', () => {
      this.hide();
      if (onRestart) onRestart();
    });

    homeBtn?.addEventListener('click', () => {
      this.hide();
      if (onHome) onHome();
    });

    // Start Confetti Canvas
    this.canvas = overlay.querySelector('#confetti-canvas') as HTMLCanvasElement;
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.ctx = this.canvas.getContext('2d');
      this.setupConfetti();
      this.animateConfetti();
      
      window.addEventListener('resize', this.handleResize);
    }
  }

  private static readonly handleResize = () => {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  };

  public static hide() {
    window.removeEventListener('resize', this.handleResize);
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
  }

  private static setupConfetti() {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#FF85B3', '#A78BFA', '#34D399'];
    this.particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * -window.innerHeight - 20,
      r: Math.random() * 6 + 4,
      d: Math.random() * window.innerHeight,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    }));
  }

  private static animateConfetti() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let active = false;

    this.particles.forEach(p => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(p.tiltAngle);
      p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 15;

      if (p.y <= this.canvas!.height) {
        active = true;
      }

      this.ctx!.beginPath();
      this.ctx!.lineWidth = p.r;
      this.ctx!.strokeStyle = p.color;
      this.ctx!.moveTo(p.x + p.tilt + p.r / 2, p.y);
      this.ctx!.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      this.ctx!.stroke();
    });

    if (active) {
      this.animationFrameId = requestAnimationFrame(() => this.animateConfetti());
    }
  }
}
