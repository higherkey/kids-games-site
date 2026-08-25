import { BaseGame } from '../../core/BaseGame';

interface SoundButton {
  id: number;
  label: string;
  color: string;
  x: number;
  y: number;
  radius: number;
  isActive: boolean;
  instrument: string;
  note: string;
}

type GamePhase = 'ready' | 'show' | 'wait' | 'play' | 'won' | 'lost';

/**
 * Sound Memory: Simon-style auditory pattern recognition.
 * Players repeat the sequence of sounds shown by the game.
 */
export class SoundMemoryGame extends BaseGame {
  private buttons: SoundButton[] = [];

  private readonly sequence: number[] = [];
  private playerSequence: number[] = [];
  private phase: GamePhase = 'ready';
  private level = 0;
  private readonly highlightDuration = 400; // ms per highlight
  private activeTimeouts: ReturnType<typeof setTimeout>[] = [];

  protected onInit(): void {
    this.activeTimeouts = [];

    this.createButtons();
    this.startNewRound();

    this.canvas?.addEventListener('touchstart', this.handleTouch);
    this.canvas?.addEventListener('mousedown', this.handleMouseDown);
  }

  private createButtons() {
    if (!this.canvas) return;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = 70;
    const spacing = 150;

    this.buttons = [
      {
        id: 0,
        label: 'Do',
        color: '#FF6B6B',
        x: centerX - spacing,
        y: centerY - spacing,
        radius,
        isActive: false,
        instrument: 'bell',
        note: 'C4'
      },
      {
        id: 1,
        label: 'Re',
        color: '#4ECDC4',
        x: centerX + spacing,
        y: centerY - spacing,
        radius,
        isActive: false,
        instrument: 'bell',
        note: 'D4'
      },
      {
        id: 2,
        label: 'Mi',
        color: '#FFD93D',
        x: centerX - spacing,
        y: centerY + spacing,
        radius,
        isActive: false,
        instrument: 'bell',
        note: 'E4'
      },
      {
        id: 3,
        label: 'Sol',
        color: '#A0522D',
        x: centerX + spacing,
        y: centerY + spacing,
        radius,
        isActive: false,
        instrument: 'bell',
        note: 'G4'
      }
    ];
  }

  private setGameTimeout(callback: () => void, delay: number) {
    const timer = setTimeout(() => {
      this.activeTimeouts = this.activeTimeouts.filter(t => t !== timer);
      callback();
    }, delay);
    this.activeTimeouts.push(timer);
    return timer;
  }

  private clearAllTimeouts() {
    this.activeTimeouts.forEach(t => clearTimeout(t));
    this.activeTimeouts = [];
  }

  private startNewRound() {
    this.level++;
    this.sequence.push(Math.floor(Math.random() * 4));
    this.playerSequence = [];
    this.phase = 'show';
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  private readonly handleTouch = (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    const pos = this.getCanvasPos(touch.clientX, touch.clientY);
    this.handleButtonPress(pos.x, pos.y);
  };

  private readonly handleMouseDown = (e: MouseEvent) => {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.handleButtonPress(pos.x, pos.y);
  };

  private handleButtonPress(x: number, y: number) {
    if (this.phase !== 'play') return;

    for (const button of this.buttons) {
      const dist = Math.hypot((x - button.x), (y - button.y));
      if (dist < button.radius) {
        this.activateButton(button.id);
        break;
      }
    }
  }

  private activateButton(buttonId: number) {
    const button = this.buttons[buttonId];
    button.isActive = true;

    this.audio.play(`synth:${button.instrument}`, button.note);
    this.haptics.lightTap();

    this.playerSequence.push(buttonId);

    this.setGameTimeout(() => {
      button.isActive = false;
      
      // Check if player made a mistake
      if (this.playerSequence.at(-1) !== this.sequence[this.playerSequence.length - 1]) {
        this.phase = 'lost';
        return;
      }

      // Check if player completed the sequence
      if (this.playerSequence.length === this.sequence.length) {
        this.phase = 'won';
      }
    }, 150);
  }

  private playSequence() {
    let delay = 0;
    for (const buttonId of this.sequence) {
      this.setGameTimeout(() => {
        const button = this.buttons[buttonId];
        button.isActive = true;
        this.audio.play(`synth:${button.instrument}`, button.note);
        this.haptics.lightTap();

        this.setGameTimeout(() => {
          button.isActive = false;
        }, 150);
      }, delay);
      delay += this.highlightDuration + 200;
    }

    this.setGameTimeout(() => {
      this.phase = 'play';
    }, delay);
  }

  update(_dt: number): void {
    if (this.phase === 'show') {
      this.playSequence();
      this.phase = 'wait'; // Transition to wait, playSequence will handle timing
    }

    if (this.phase === 'won') {
      // After a brief pause, start the next round
      this.setGameTimeout(() => {
        this.startNewRound();
      }, 1000);
      this.phase = 'wait';
    }

    this.render();
  }

  private render() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Background
    this.ctx.fillStyle = '#F4ECD8';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw buttons
    this.buttons.forEach(button => {
      // Button shadow
      this.ctx!.fillStyle = 'rgba(0, 0, 0, 0.2)';
      this.ctx!.beginPath();
      this.ctx!.arc(button.x, button.y + 6, button.radius, 0, Math.PI * 2);
      this.ctx!.fill();

      // Button body with gradient
      const grad = this.ctx!.createRadialGradient(
        button.x - button.radius * 0.3,
        button.y - button.radius * 0.3,
        button.radius * 0.2,
        button.x,
        button.y,
        button.radius
      );

      const baseColor = button.color;
      grad.addColorStop(0, this.lightenColor(baseColor, 0.4));
      grad.addColorStop(1, baseColor);

      this.ctx!.fillStyle = grad;
      this.ctx!.beginPath();
      this.ctx!.arc(button.x, button.y, button.radius, 0, Math.PI * 2);
      this.ctx!.fill();

      // Active state (glow and scale)
      if (button.isActive) {
        this.ctx!.strokeStyle = `${baseColor}80`;
        this.ctx!.lineWidth = 6;
        this.ctx!.stroke();
      }

      // Button label (note name)
      this.ctx!.fillStyle = '#FFFFFF';
      this.ctx!.font = 'bold 24px Fredoka, sans-serif';
      this.ctx!.textAlign = 'center';
      this.ctx!.textBaseline = 'middle';
      this.ctx!.fillText(button.label, button.x, button.y);
    });

    // HUD: Level and instructions
    this.ctx.fillStyle = '#2B2D5E';
    this.ctx.font = 'bold 28px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`Level ${this.level}`, this.canvas.width / 2, 30);

    // Status text
    this.ctx.font = '18px Fredoka, sans-serif';
    let statusText = '';
    if (this.phase === 'show' || this.phase === 'wait') {
      statusText = 'Listen to the pattern...';
    } else if (this.phase === 'play') {
      statusText = 'Your turn!';
    } else if (this.phase === 'won') {
      statusText = 'Correct! 🎉';
    } else if (this.phase === 'lost') {
      statusText = 'Oops! Game Over';
    }
    this.ctx.fillText(statusText, this.canvas.width / 2, this.canvas.height - 60);
  }

  private lightenColor(color: string, factor: number): string {
    const hex = color.replace('#', '');
    const r = Math.min(255, Math.round(Number.parseInt(hex.substring(0, 2), 16) + (255 - Number.parseInt(hex.substring(0, 2), 16)) * factor));
    const g = Math.min(255, Math.round(Number.parseInt(hex.substring(2, 4), 16) + (255 - Number.parseInt(hex.substring(2, 4), 16)) * factor));
    const b = Math.min(255, Math.round(Number.parseInt(hex.substring(4, 6), 16) + (255 - Number.parseInt(hex.substring(4, 6), 16)) * factor));
    return `rgb(${r}, ${g}, ${b})`;
  }



  destroy(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('touchstart', this.handleTouch);
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    }
    this.clearAllTimeouts();
  }
}

