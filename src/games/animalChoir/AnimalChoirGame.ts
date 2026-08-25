import type { Game } from '../../core/Game';
import { AudioController } from '../../core/AudioController';
import { HapticController } from '../../core/HapticController';

export type AnimalName = 'Cat' | 'Dog' | 'Frog' | 'Duck' | 'Bird' | 'Bear' | 'Pig' | 'Owl';

export interface AnimalCharacter {
  name: AnimalName;
  emoji: string;
  color: string;
  activeColor: string;
  defaultNote: string;
  voiceInstrument: string; // instrument passed to synth engine or audio controller
}

interface ChoirGridNode {
  col: number;
  row: number;
  animalIndex: number;
  active: boolean; // toggle state in sequencer
  bounceProgress: number; // 0 to 1 for animated singing bounce
  playHighlight: number; // 0 to 1 for playhead trigger flash
}

export class AnimalChoirGame implements Game {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private readonly audio: AudioController;
  private readonly haptics: HapticController;
  private paused: boolean = false;

  public readonly cols: number = 4;
  public readonly rows: number = 4;
  private grid: ChoirGridNode[][] = [];

  // Musical Scale C4 to C5
  public readonly pitchScale: string[] = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];

  public readonly animals: AnimalCharacter[] = [
    { name: 'Cat', emoji: '🐱', color: '#FF85B3', activeColor: '#FFB0CF', defaultNote: 'C4', voiceInstrument: 'pluck' },
    { name: 'Dog', emoji: '🐶', color: '#FB923C', activeColor: '#FDBA74', defaultNote: 'D4', voiceInstrument: 'bell' },
    { name: 'Frog', emoji: '🐸', color: '#4ADE80', activeColor: '#86EFAC', defaultNote: 'E4', voiceInstrument: 'chime' },
    { name: 'Duck', emoji: '🦆', color: '#FACC15', activeColor: '#FDE047', defaultNote: 'F4', voiceInstrument: 'pluck' },
    { name: 'Bird', emoji: '🐦', color: '#38BDF8', activeColor: '#7DD3FC', defaultNote: 'G4', voiceInstrument: 'chime' },
    { name: 'Bear', emoji: '🐻', color: '#A78BFA', activeColor: '#C4B5FD', defaultNote: 'A4', voiceInstrument: 'bell' },
    { name: 'Pig', emoji: '🐷', color: '#F472B6', activeColor: '#F9A8D4', defaultNote: 'B4', voiceInstrument: 'pluck' },
    { name: 'Owl', emoji: '🦉', color: '#2DD4BF', activeColor: '#5EEAD4', defaultNote: 'C5', voiceInstrument: 'chime' },
  ];

  public bpm: number = 120; // 60 to 180
  public isPlaying: boolean = true;
  private currentStep: number = 0;
  private stepTimer: number = 0;

  // Controls UI bounds
  private topControlsHeight = 65;

  constructor() {
    this.audio = AudioController.getInstance();
    this.haptics = HapticController.getInstance();
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.isPlaying = true;
    this.currentStep = 0;
    this.stepTimer = 0;

    this.initGrid();

    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
  }

  private initGrid(): void {
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      const row: ChoirGridNode[] = [];
      for (let c = 0; c < this.cols; c++) {
        // Assign distinct animal per row/cell default
        const animalIndex = (r * this.cols + c) % this.animals.length;
        row.push({
          col: c,
          row: r,
          animalIndex,
          active: (r + c) % 2 === 0, // default pattern preset
          bounceProgress: 0,
          playHighlight: 0,
        });
      }
      this.grid.push(row);
    }
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  private handleMouseDown = (e: MouseEvent) => {
    if (this.paused) return;
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.handleInteraction(pos.x, pos.y);
  };

  private handleTouchStart = (e: TouchEvent) => {
    if (this.paused) return;
    e.preventDefault();
    Array.from(e.changedTouches).forEach(touch => {
      const pos = this.getCanvasPos(touch.clientX, touch.clientY);
      this.handleInteraction(pos.x, pos.y);
    });
  };

  private handleInteraction(x: number, y: number): void {
    if (!this.canvas) return;
    const w = this.canvas.width;

    // Check Top Controls (Play/Pause, BPM buttons)
    if (y <= this.topControlsHeight) {
      // Play/Pause button
      const playBtnW = 90;
      if (x >= 15 && x <= 15 + playBtnW) {
        this.isPlaying = !this.isPlaying;
        this.audio.play('synth:click', 'C5');
        this.haptics.lightTap();
        return;
      }

      // BPM Minus Button
      const bpmMinusX = w - 150;
      if (x >= bpmMinusX && x <= bpmMinusX + 40) {
        this.bpm = Math.max(60, this.bpm - 10);
        this.audio.play('synth:click', 'G3');
        this.haptics.lightTap();
        return;
      }

      // BPM Plus Button
      const bpmPlusX = w - 55;
      if (x >= bpmPlusX && x <= bpmPlusX + 40) {
        this.bpm = Math.min(180, this.bpm + 10);
        this.audio.play('synth:click', 'G4');
        this.haptics.lightTap();
        return;
      }
      return;
    }

    // Check 4x4 Grid Cards
    const gridW = w - 30;
    const gridH = this.canvas.height - this.topControlsHeight - 30;
    const gridX = 15;
    const gridY = this.topControlsHeight + 15;

    if (x >= gridX && x <= gridX + gridW && y >= gridY && y <= gridY + gridH) {
      const cellW = gridW / this.cols;
      const cellH = gridH / this.rows;

      const c = Math.floor((x - gridX) / cellW);
      const r = Math.floor((y - gridY) / cellH);

      if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
        const node = this.grid[r][c];
        node.active = !node.active;

        this.triggerNodeSing(node);
      }
    }
  }

  private triggerNodeSing(node: ChoirGridNode): void {
    node.bounceProgress = 1.0;
    node.playHighlight = 1.0;

    const animal = this.animals[node.animalIndex];
    // Map node row/col pitch across scale C4 to C5
    const noteIndex = (node.row * 2 + node.col) % this.pitchScale.length;
    const pitch = this.pitchScale[noteIndex];

    this.audio.play(`synth:${animal.voiceInstrument}`, pitch);
    this.haptics.lightTap();
  }

  public setBpm(bpm: number): void {
    this.bpm = Math.max(60, Math.min(180, bpm));
  }

  public getGrid(): ChoirGridNode[][] {
    return this.grid;
  }

  update(dt: number): void {
    if (!this.canvas || !this.ctx || this.paused) return;

    // Decay bounce animations
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const node = this.grid[r][c];
        if (node.bounceProgress > 0) {
          node.bounceProgress = Math.max(0, node.bounceProgress - dt * 0.006);
        }
        if (node.playHighlight > 0) {
          node.playHighlight = Math.max(0, node.playHighlight - dt * 0.005);
        }
      }
    }

    // Sequencer Playhead step advancement
    if (this.isPlaying) {
      const stepIntervalMs = (60 / this.bpm) * 1000 * 0.5; // Eighth note / 16th resolution step
      this.stepTimer += dt;

      if (this.stepTimer >= stepIntervalMs) {
        this.stepTimer %= stepIntervalMs;
        this.currentStep = (this.currentStep + 1) % this.cols;

        // Trigger all active animals in currentStep column
        for (let r = 0; r < this.rows; r++) {
          const node = this.grid[r][this.currentStep];
          if (node.active) {
            this.triggerNodeSing(node);
          }
        }
      }
    }

    this.render();
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background - Dark Purple Stage
    const stageGrad = this.ctx.createLinearGradient(0, 0, 0, h);
    stageGrad.addColorStop(0, '#1E1B4B');
    stageGrad.addColorStop(1, '#31103F');
    this.ctx.fillStyle = stageGrad;
    this.ctx.fillRect(0, 0, w, h);

    // Draw Top Controls Bar
    this.renderTopControls(w);

    // Draw Grid Container & Cards
    const gridW = w - 30;
    const gridH = h - this.topControlsHeight - 30;
    const gridX = 15;
    const gridY = this.topControlsHeight + 15;
    const cellW = gridW / this.cols;
    const cellH = gridH / this.rows;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cx = gridX + c * cellW;
        const cy = gridY + r * cellH;
        const node = this.grid[r][c];
        const animal = this.animals[node.animalIndex];

        this.renderAnimalCard(cx + 6, cy + 6, cellW - 12, cellH - 12, node, animal);
      }
    }

    // Draw Sequencer Playhead Sweep Line
    if (this.isPlaying) {
      const playheadX = gridX + this.currentStep * cellW + cellW / 2;
      this.ctx.save();
      this.ctx.shadowColor = '#60A5FA';
      this.ctx.shadowBlur = 15;
      this.ctx.strokeStyle = 'rgba(96, 165, 250, 0.85)';
      this.ctx.lineWidth = 6;
      this.ctx.beginPath();
      this.ctx.moveTo(playheadX, gridY);
      this.ctx.lineTo(playheadX, gridY + gridH);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private renderTopControls(w: number): void {
    if (!this.ctx) return;
    this.ctx.save();

    // Play/Pause Button
    const playBtnW = 90;
    const playBtnH = 38;
    const btnY = 12;

    this.ctx.fillStyle = this.isPlaying ? '#22C55E' : '#EAB308';
    this.ctx.strokeStyle = this.isPlaying ? '#4ADE80' : '#FACC15';
    this.ctx.lineWidth = 2;
    this.roundRect(15, btnY, playBtnW, playBtnH, 14);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(this.isPlaying ? '⏸ Pause' : '▶ Play', 15 + playBtnW / 2, btnY + playBtnH / 2);

    // BPM Controller
    const bpmMinusX = w - 150;
    const bpmPlusX = w - 55;
    const bpmDisplayX = w - 95;

    // BPM - Button
    this.ctx.fillStyle = '#374151';
    this.roundRect(bpmMinusX, btnY, 40, playBtnH, 10);
    this.ctx.fill();
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.fillText('-', bpmMinusX + 20, btnY + playBtnH / 2);

    // BPM Display
    this.ctx.fillStyle = '#F3F4F6';
    this.ctx.font = 'bold 13px sans-serif';
    this.ctx.fillText(`${this.bpm} BPM`, bpmDisplayX, btnY + playBtnH / 2);

    // BPM + Button
    this.ctx.fillStyle = '#374151';
    this.roundRect(bpmPlusX, btnY, 40, playBtnH, 10);
    this.ctx.fill();
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.fillText('+', bpmPlusX + 20, btnY + playBtnH / 2);

    this.ctx.restore();
  }

  private renderAnimalCard(
    x: number,
    y: number,
    w: number,
    h: number,
    node: ChoirGridNode,
    animal: AnimalCharacter
  ): void {
    if (!this.ctx) return;
    this.ctx.save();

    // Squishy bounce scaling
    const bounceOffset = Math.sin(node.bounceProgress * Math.PI) * 10;
    const cardY = y - bounceOffset;

    // Card background glow / stroke
    if (node.playHighlight > 0) {
      this.ctx.shadowColor = '#FFFFFF';
      this.ctx.shadowBlur = 20 * node.playHighlight;
    }

    this.ctx.fillStyle = node.active ? animal.color : '#334155';
    this.ctx.strokeStyle = node.active ? animal.activeColor : '#475569';
    this.ctx.lineWidth = node.active ? 3 : 1;
    this.roundRect(x, cardY, w, h, 18);
    this.ctx.fill();
    this.ctx.stroke();

    // Animal Emoji & Name
    const centerX = x + w / 2;
    const centerY = cardY + h / 2;

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Emoji icon
    const fontSize = Math.min(w, h) * 0.42;
    this.ctx.font = `${fontSize}px sans-serif`;
    this.ctx.fillText(animal.emoji, centerX, centerY - 6);

    // Label & Note
    const noteIndex = (node.row * 2 + node.col) % this.pitchScale.length;
    const pitch = this.pitchScale[noteIndex];
    this.ctx.fillStyle = node.active ? '#1E293B' : '#94A3B8';
    this.ctx.font = `bold ${Math.min(w, h) * 0.16}px sans-serif`;
    this.ctx.fillText(`${animal.name} (${pitch})`, centerX, centerY + h * 0.32);

    this.ctx.restore();
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
    this.grid = [];
  }
}
