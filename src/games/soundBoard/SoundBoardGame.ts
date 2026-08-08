import { BaseGame } from '../../core/BaseGame';
import { ToneAudioController } from '../../core/ToneAudioController';

interface SoundPad {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  activeColor: string;
  label: string;
  instrument: string;
  note: string;
  active: number;
}

export class SoundBoardGame extends BaseGame {
  private pads: SoundPad[] = [];
  private paused = false;

  private readonly padConfigs = [
    { color: '#FF5E5E', activeColor: '#FF8A8A', label: 'Bell', instrument: 'bell', note: 'C4' },
    { color: '#6BCBFF', activeColor: '#9DDEFF', label: 'Guitar', instrument: 'pluck', note: 'E4' },
    { color: '#FFE66D', activeColor: '#FFF0A0', label: 'Chime', instrument: 'chime', note: 'G4' },
    { color: '#4ECDC4', activeColor: '#7EDDD6', label: 'Click', instrument: 'click', note: 'C6' },
    { color: '#FF85B3', activeColor: '#FFB0CF', label: 'Drum', instrument: 'drum', note: 'C2' },
    { color: '#A78BFA', activeColor: '#C4B5FD', label: 'Bell High', instrument: 'bell', note: 'E5' },
    { color: '#34D399', activeColor: '#6EE7B7', label: 'Harp', instrument: 'pluck', note: 'A4' },
    { color: '#FB923C', activeColor: '#FDBA74', label: 'Ding', instrument: 'chime', note: 'C5' },
    { color: '#F472B6', activeColor: '#F9A8D4', label: 'Thump', instrument: 'drum', note: 'E2' },
  ];



  protected onInit(): void {
    this.paused = false;
    this.buildGrid();

    this.canvas?.addEventListener('mousedown', this.handleMouse);
    this.canvas?.addEventListener('touchstart', this.handleTouch);
  }

  private buildGrid() {
    if (!this.canvas) return;
    this.pads = [];

    const cols = 3;
    const rows = 3;
    const padding = 16;
    const totalW = this.canvas.width - padding * 2;
    const totalH = this.canvas.height - padding * 2;
    const padW = (totalW - padding * (cols - 1)) / cols;
    const padH = (totalH - padding * (rows - 1)) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx >= this.padConfigs.length) break;
        const cfg = this.padConfigs[idx];
        this.pads.push({
          x: padding + c * (padW + padding),
          y: padding + r * (padH + padding),
          width: padW,
          height: padH,
          color: cfg.color,
          activeColor: cfg.activeColor,
          label: cfg.label,
          instrument: cfg.instrument,
          note: cfg.note,
          active: 0,
        });
      }
    }
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  private readonly handleTouch = (e: TouchEvent) => {
    if (this.paused) return;
    Array.from(e.changedTouches).forEach(touch => {
      const pos = this.getCanvasPos(touch.clientX, touch.clientY);
      this.hitTest(pos.x, pos.y);
    });
  };

  private readonly handleMouse = (e: MouseEvent) => {
    if (this.paused) return;
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.hitTest(pos.x, pos.y);
  };

  private hitTest(x: number, y: number) {
    for (const pad of this.pads) {
      if (
        x >= pad.x && x <= pad.x + pad.width &&
        y >= pad.y && y <= pad.y + pad.height
      ) {
        this.triggerPad(pad);
        break;
      }
    }
  }

  private triggerPad(pad: SoundPad) {
    pad.active = 1.0;
    this.haptics.lightTap();
    const padIndex = this.pads.indexOf(pad);
    ToneAudioController.getInstance().playSoundBoardNote(padIndex >= 0 ? padIndex : 0, 5);
  }

  update(dt: number): void {
    if (!this.canvas || !this.ctx) return;

    // Fade active states
    for (const pad of this.pads) {
      if (pad.active > 0) {
        pad.active = Math.max(0, pad.active - dt * 0.004);
      }
    }

    this.render();
  }

  private render() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Background
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (const pad of this.pads) {
      const borderRadius = 20;

      // Glow when active
      if (pad.active > 0) {
        this.ctx.save();
        this.ctx.shadowColor = pad.activeColor;
        this.ctx.shadowBlur = 30 * pad.active;
        this.ctx.fillStyle = pad.activeColor;
        this.roundRect(pad.x, pad.y, pad.width, pad.height, borderRadius);
        this.ctx.fill();
        this.ctx.restore();
      }

      // Pad body
      const lerp = pad.active;
      this.ctx.fillStyle = lerp > 0 ? pad.activeColor : pad.color;
      this.roundRect(pad.x, pad.y, pad.width, pad.height, borderRadius);
      this.ctx.fill();

      // Scale effect when active
      const scale = 1 + pad.active * 0.05;
      const cx = pad.x + pad.width / 2;
      const cy = pad.y + pad.height / 2;

      // Label
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.scale(scale, scale);
      this.ctx.fillStyle = '#2F3061';
      this.ctx.font = `600 ${Math.min(pad.width, pad.height) * 0.18}px Fredoka, sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(pad.label, 0, 0);
      this.ctx.restore();
    }
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
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
      this.canvas.removeEventListener('mousedown', this.handleMouse);
      this.canvas.removeEventListener('touchstart', this.handleTouch);
    }
  }
}

