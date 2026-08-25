import type { Game } from '../../core/Game';
import { AudioController } from '../../core/AudioController';
import { HapticController } from '../../core/HapticController';

export type CommandType = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'JUMP';

export interface GridPos {
  x: number;
  y: number;
}

export class VibeCoderGame implements Game {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private audio: AudioController;
  private haptics: HapticController;

  private gridWidth = 5;
  private gridHeight = 5;
  private playerPos: GridPos = { x: 0, y: 0 };
  private startPos: GridPos = { x: 0, y: 0 };
  private goalPos: GridPos = { x: 4, y: 4 };
  private stars: GridPos[] = [];
  private collectedStars = 0;

  private commandQueue: CommandType[] = [];
  private isExecuting = false;
  private executionStepIndex = 0;
  private stepTimer = 0;
  private stepDelay = 400; // ms per step execution

  private gameWon = false;
  private paused = false;
  private level = 1;

  private paletteButtons: Array<{ command: CommandType; label: string; icon: string; x: number; y: number; width: number; height: number; color: string }> = [];
  private playButton = { x: 0, y: 0, width: 90, height: 45 };
  private clearButton = { x: 0, y: 0, width: 80, height: 45 };

  constructor() {
    this.audio = AudioController.getInstance();
    this.haptics = HapticController.getInstance();
    this.audio.registerSound('step', '/sounds/pop.ogg');
    this.audio.registerSound('star', '/sounds/pop.ogg');
    this.audio.registerSound('win', '/sounds/pop.ogg');
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.level = 1;
    this.gameWon = false;
    this.isExecuting = false;
    this.commandQueue = [];
    this.paused = false;

    this.setupLevel();

    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
  }

  private setupLevel() {
    this.startPos = { x: 0, y: 0 };
    this.playerPos = { ...this.startPos };
    this.commandQueue = [];
    this.isExecuting = false;
    this.executionStepIndex = 0;
    this.gameWon = false;
    this.collectedStars = 0;

    if (this.level === 1) {
      this.gridWidth = 4;
      this.gridHeight = 4;
      this.goalPos = { x: 3, y: 3 };
      this.stars = [{ x: 1, y: 1 }, { x: 2, y: 2 }];
    } else if (this.level === 2) {
      this.gridWidth = 5;
      this.gridHeight = 5;
      this.goalPos = { x: 4, y: 3 };
      this.stars = [{ x: 1, y: 0 }, { x: 2, y: 3 }, { x: 4, y: 1 }];
    } else {
      this.gridWidth = 5;
      this.gridHeight = 5;
      this.goalPos = { x: 4, y: 4 };
      this.stars = [{ x: 0, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 1 }];
    }
  }

  private addCommand(cmd: CommandType) {
    if (this.isExecuting || this.commandQueue.length >= 10) return;
    this.commandQueue.push(cmd);
    this.audio.play('step');
    this.haptics.lightTap();
  }

  private removeLastCommand() {
    if (this.isExecuting || this.commandQueue.length === 0) return;
    this.commandQueue.pop();
    this.audio.play('step');
    this.haptics.lightTap();
  }

  private clearCommands() {
    if (this.isExecuting) return;
    this.commandQueue = [];
    this.playerPos = { ...this.startPos };
    this.audio.play('step');
    this.haptics.lightTap();
  }

  private startExecution() {
    if (this.isExecuting || this.commandQueue.length === 0) return;
    this.isExecuting = true;
    this.executionStepIndex = 0;
    this.stepTimer = 0;
    this.playerPos = { ...this.startPos };
    this.collectedStars = 0;
    // Reset stars to their original positions for this level so re-runs are fair
    this.resetStarsForLevel();
    this.haptics.lightTap();
  }

  private resetStarsForLevel(): void {
    if (this.level === 1) {
      this.stars = [{ x: 1, y: 1 }, { x: 2, y: 2 }];
    } else if (this.level === 2) {
      this.stars = [{ x: 1, y: 0 }, { x: 2, y: 3 }, { x: 4, y: 1 }];
    } else {
      this.stars = [{ x: 0, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 1 }];
    }
  }

  private executeStep() {
    if (this.executionStepIndex >= this.commandQueue.length) {
      this.isExecuting = false;
      this.checkGoal();
      return;
    }

    const cmd = this.commandQueue[this.executionStepIndex];
    let dx = 0;
    let dy = 0;

    if (cmd === 'UP') dy = -1;
    else if (cmd === 'DOWN') dy = 1;
    else if (cmd === 'LEFT') dx = -1;
    else if (cmd === 'RIGHT') dx = 1;
    else if (cmd === 'JUMP') {
      dx = 2;
    }

    const nextX = Math.max(0, Math.min(this.gridWidth - 1, this.playerPos.x + dx));
    const nextY = Math.max(0, Math.min(this.gridHeight - 1, this.playerPos.y + dy));

    this.playerPos = { x: nextX, y: nextY };
    this.audio.play('step');
    this.haptics.lightTap();

    // Check star collision
    const starIndex = this.stars.findIndex(s => s.x === this.playerPos.x && s.y === this.playerPos.y);
    if (starIndex !== -1) {
      this.stars.splice(starIndex, 1);
      this.collectedStars++;
      this.audio.play('star');
      this.haptics.lightTap();
    }

    this.executionStepIndex++;
    if (this.executionStepIndex >= this.commandQueue.length) {
      this.isExecuting = false;
      this.checkGoal();
    }
  }

  private checkGoal() {
    if (this.playerPos.x === this.goalPos.x && this.playerPos.y === this.goalPos.y) {
      this.gameWon = true;
      this.audio.play('win');
      this.haptics.success();
    }
  }

  private handleMouseDown = (e: MouseEvent) => {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.handleTap(pos.x, pos.y);
  };

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const pos = this.getCanvasPos(touch.clientX, touch.clientY);
    this.handleTap(pos.x, pos.y);
  };

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  private handleTap(x: number, y: number) {
    if (!this.canvas) return;

    if (this.gameWon) {
      this.level++;
      this.setupLevel();
      return;
    }

    // Check Run & Clear controls
    const h = this.canvas.height;
    const w = this.canvas.width;

    if (y >= h - 140 && y <= h - 90) {
      if (x >= this.playButton.x && x <= this.playButton.x + this.playButton.width) {
        this.startExecution();
        return;
      }
      if (x >= this.clearButton.x && x <= this.clearButton.x + this.clearButton.width) {
        this.clearCommands();
        return;
      }
    }

    // Check Palette buttons (bottom bar y > h - 80)
    for (const btn of this.paletteButtons) {
      if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
        this.addCommand(btn.command);
        return;
      }
    }
  }

  update(dt: number): void {
    if (this.paused) return;

    if (this.isExecuting) {
      this.stepTimer += dt;
      if (this.stepTimer >= this.stepDelay) {
        this.stepTimer = 0;
        this.executeStep();
      }
    }

    this.render();
  }

  private render() {
    if (!this.ctx || !this.canvas) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = '#181E29';
    this.ctx.fillRect(0, 0, w, h);

    // Title / Level Header
    this.ctx.fillStyle = '#4ECDC4';
    this.ctx.font = 'bold 22px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`VibeCoder - Level ${this.level}`, w / 2, 35);

    // Calculate Grid layout
    const gridTop = 60;
    const availableHeight = h - 220;
    const cellSize = Math.min(Math.floor(w * 0.8 / this.gridWidth), Math.floor(availableHeight / this.gridHeight));
    const gridLeft = (w - cellSize * this.gridWidth) / 2;

    // Draw Grid
    for (let r = 0; r < this.gridHeight; r++) {
      for (let c = 0; c < this.gridWidth; c++) {
        const cx = gridLeft + c * cellSize;
        const cy = gridTop + r * cellSize;

        this.ctx.fillStyle = (r + c) % 2 === 0 ? '#232D3F' : '#2A364F';
        this.ctx.fillRect(cx, cy, cellSize, cellSize);

        this.ctx.strokeStyle = '#3A4866';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(cx, cy, cellSize, cellSize);
      }
    }

    // Draw Stars
    this.stars.forEach(s => {
      const cx = gridLeft + s.x * cellSize + cellSize / 2;
      const cy = gridTop + s.y * cellSize + cellSize / 2;

      this.ctx!.fillStyle = '#FFE66D';
      this.ctx!.font = `${cellSize * 0.5}px sans-serif`;
      this.ctx!.textAlign = 'center';
      this.ctx!.textBaseline = 'middle';
      this.ctx!.fillText('⭐', cx, cy);
    });

    // Draw Goal (Treat / Chest)
    const gx = gridLeft + this.goalPos.x * cellSize + cellSize / 2;
    const gy = gridTop + this.goalPos.y * cellSize + cellSize / 2;
    this.ctx.fillStyle = '#FF85B3';
    this.ctx.font = `${cellSize * 0.5}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('🎁', gx, gy);

    // Draw Character (Cute Bot)
    const px = gridLeft + this.playerPos.x * cellSize + cellSize / 2;
    const py = gridTop + this.playerPos.y * cellSize + cellSize / 2;
    this.ctx.fillStyle = '#6BCBFF';
    this.ctx.font = `${cellSize * 0.55}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('🤖', px, py);

    // Draw Command Queue Display
    this.drawCommandQueue(gridTop + this.gridHeight * cellSize + 20, w);

    // Draw Palette Controls
    this.drawPaletteUI(h, w);

    if (this.gameWon) {
      this.drawWinOverlay(w, h);
    }
  }

  private drawCommandQueue(y: number, w: number) {
    if (!this.ctx) return;

    this.ctx.fillStyle = '#232D3F';
    this.ctx.strokeStyle = '#3A4866';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(20, y, w - 40, 50, 10);
    this.ctx.fill();
    this.ctx.stroke();

    // Render queued command icons
    const iconMap: Record<CommandType, string> = { UP: '⬆️', DOWN: '⬇️', LEFT: '⬅️', RIGHT: '➡️', JUMP: '🦘' };
    const startX = 35;
    this.commandQueue.forEach((cmd, i) => {
      const isCurrentStep = this.isExecuting && i === this.executionStepIndex;
      const x = startX + i * 36;
      
      if (isCurrentStep) {
        this.ctx!.fillStyle = '#FFE66D';
        this.ctx!.beginPath();
        this.ctx!.arc(x + 12, y + 25, 16, 0, Math.PI * 2);
        this.ctx!.fill();
      }

      this.ctx!.font = '20px sans-serif';
      this.ctx!.textAlign = 'center';
      this.ctx!.textBaseline = 'middle';
      this.ctx!.fillText(iconMap[cmd], x + 12, y + 25);
    });

    // Setup Run / Clear buttons position
    this.playButton = { x: w - 195, y: y + 2.5, width: 80, height: 45 };
    this.clearButton = { x: w - 110, y: y + 2.5, width: 80, height: 45 };

    // Draw Play Button
    this.ctx.fillStyle = this.isExecuting ? '#7F8C8D' : '#34D399';
    this.ctx.beginPath();
    this.ctx.roundRect(this.playButton.x, this.playButton.y, this.playButton.width, this.playButton.height, 8);
    this.ctx.fill();
    this.ctx.fillStyle = '#181E29';
    this.ctx.font = 'bold 15px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('▶ RUN', this.playButton.x + 40, this.playButton.y + 22);

    // Draw Clear Button
    this.ctx.fillStyle = '#FF5E5E';
    this.ctx.beginPath();
    this.ctx.roundRect(this.clearButton.x, this.clearButton.y, this.clearButton.width, this.clearButton.height, 8);
    this.ctx.fill();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 15px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('CLEAR', this.clearButton.x + 40, this.clearButton.y + 22);
  }

  private drawPaletteUI(h: number, w: number) {
    if (!this.ctx) return;

    const commands: Array<{ command: CommandType; label: string; icon: string; color: string }> = [
      { command: 'UP', label: 'Up', icon: '⬆️', color: '#4ECDC4' },
      { command: 'DOWN', label: 'Down', icon: '⬇️', color: '#4ECDC4' },
      { command: 'LEFT', label: 'Left', icon: '⬅️', color: '#4ECDC4' },
      { command: 'RIGHT', label: 'Right', icon: '➡️', color: '#4ECDC4' },
      { command: 'JUMP', label: 'Jump', icon: '🦘', color: '#A78BFA' },
    ];

    const btnWidth = Math.min(65, (w - 60) / 5);
    const spacing = (w - btnWidth * 5) / 6;
    const btnY = h - 70;

    this.paletteButtons = [];

    commands.forEach((cmd, i) => {
      const btnX = spacing + i * (btnWidth + spacing);
      this.paletteButtons.push({
        ...cmd,
        x: btnX,
        y: btnY,
        width: btnWidth,
        height: 55,
      });

      this.ctx!.fillStyle = cmd.color;
      this.ctx!.strokeStyle = '#ffffff';
      this.ctx!.lineWidth = 2;
      this.ctx!.beginPath();
      this.roundRect(btnX, btnY, btnWidth, 55, 10);
      this.ctx!.fill();
      this.ctx!.stroke();

      this.ctx!.font = '22px sans-serif';
      this.ctx!.textAlign = 'center';
      this.ctx!.textBaseline = 'middle';
      this.ctx!.fillText(cmd.icon, btnX + btnWidth / 2, btnY + 27);
    });
  }

  private drawWinOverlay(w: number, h: number) {
    if (!this.ctx) return;

    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.fillStyle = '#FFE66D';
    this.ctx.font = 'bold 36px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('🌟 MAZE SOLVED! 🌟', w / 2, h / 2 - 20);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px Fredoka, sans-serif';
    this.ctx.fillText('Tap anywhere for next maze', w / 2, h / 2 + 30);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  destroy(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
      this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    }
    this.commandQueue = [];
    this.paletteButtons = [];
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }
}
