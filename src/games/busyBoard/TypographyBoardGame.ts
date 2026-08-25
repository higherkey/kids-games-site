import type { Game } from '../../core/Game';
import type { BusyBoardModule } from './BusyBoardModule';
import { BoardModuleRegistry } from './BoardModuleRegistry';
import { AudioController } from '../../core/AudioController';

export class TypographyBoardGame implements Game {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private modules: BusyBoardModule[] = [];
  private activeDragModule: BusyBoardModule | null = null;

  // Layout parameters
  private cols = 3;
  private rows = 2;
  private cellW = 0;
  private cellH = 0;

  // Scrolling state
  private scrollX = 0;
  private maxScrollX = 0;
  private isPanning = false;
  private panStartX = 0;
  private panStartScrollX = 0;

  constructor() {}

  public init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    const audio = AudioController.getInstance();
    audio.registerSound('busyboard:odometer_click', '/sounds/busyBoard/odometer_click.wav');
    audio.registerSound('busyboard:weight_slide', '/sounds/busyBoard/weight_slide.wav');
    audio.registerSound('busyboard:gravity_toggle', '/sounds/busyBoard/gravity_toggle.wav');
    audio.registerSound('busyboard:kinetic_hold', '/sounds/busyBoard/kinetic_hold.wav');
    audio.registerSound('busyboard:case_upper', '/sounds/busyBoard/case_upper.wav');
    audio.registerSound('busyboard:case_lower', '/sounds/busyBoard/case_lower.wav');

    this.setupLayout();
    this.setupModules();

    if (this.canvas) {
      this.canvas.addEventListener('mousedown', this.handleMouseDown);
      this.canvas.addEventListener('mousemove', this.handleMouseMove);
      this.canvas.addEventListener('mouseup', this.handleMouseUp);

      this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    }
  }

  private setupLayout() {
    if (!this.canvas) return;
    this.cols = 3;
    this.rows = 2;

    this.cellW = Math.max(300, this.canvas.width / this.cols);
    this.cellH = this.canvas.height / this.rows;

    const boardWidth = this.cols * this.cellW;
    this.maxScrollX = Math.max(0, boardWidth - this.canvas.width);
    this.scrollX = Math.min(this.scrollX, this.maxScrollX);
  }

  private setupModules() {
    this.modules = [];

    // Board 5 Grid Layout (3x2): [col, row, width, height]
    const layouts = [
      { id: '043', col: 0, row: 0, w: 1, h: 1 }, // Odometer Tumbler
      { id: '041', col: 0, row: 1, w: 1, h: 1 }, // Font Weight Morph
      { id: '047', col: 1, row: 0, w: 1, h: 2 }, // Word Gravity Switch (double height)
      { id: '046', col: 2, row: 0, w: 1, h: 1 }, // Kinetic Text Holder
      { id: '044', col: 2, row: 1, w: 1, h: 1 }, // Case Switcher
    ];

    layouts.forEach(layout => {
      const Constructor = BoardModuleRegistry[layout.id];
      if (!Constructor) {
        console.warn(`Module constructor for ID ${layout.id} not found.`);
        return;
      }

      const instance = new Constructor(
        layout.id,
        layout.col,
        layout.row,
        layout.w,
        layout.h,
        this
      );
      instance.init();
      this.modules.push(instance);
    });
  }

  public update(dt: number): void {
    // Update modules
    this.modules.forEach(module => {
      if ((module as any).update) {
        const px = module.x * this.cellW;
        const py = module.y * this.cellH;
        const pw = module.w * this.cellW;
        const ph = module.h * this.cellH;
        (module as any).update(dt, px, py, pw, ph);
      }
    });
  }

  public render(): void {
    if (!this.ctx || !this.canvas) return;

    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.translate(-this.scrollX, 0);

    // Render Board Grid Lines & Base Texture
    this.renderBoardBackground();

    // Render Modules
    this.modules.forEach(module => {
      const px = module.x * this.cellW;
      const py = module.y * this.cellH;
      const pw = module.w * this.cellW;
      const ph = module.h * this.cellH;

      this.ctx?.save();
      module.render(this.ctx!, px, py, pw, ph);
      this.ctx?.restore();
    });

    this.ctx.restore();
  }

  private renderBoardBackground(): void {
    if (!this.ctx || !this.canvas) return;

    const boardW = this.cols * this.cellW;
    const boardH = this.canvas.height;

    // Elegant Slate Typography Board Background
    this.ctx.fillStyle = '#2C3A47';
    this.ctx.fillRect(0, 0, boardW, boardH);

    // Grid lines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.lineWidth = 2;

    for (let c = 0; c <= this.cols; c++) {
      const x = c * this.cellW;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, boardH);
      this.ctx.stroke();
    }

    for (let r = 0; r <= this.rows; r++) {
      const y = r * this.cellH;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(boardW, y);
      this.ctx.stroke();
    }
  }

  // Pointer Handlers
  private handleMouseDown = (e: MouseEvent) => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + this.scrollX;
    const y = e.clientY - rect.top;
    this.processPointerDown(x, y, e.clientX);
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + this.scrollX;
    const y = e.clientY - rect.top;
    this.processPointerMove(x, y, e.clientX);
  };

  private handleMouseUp = () => {
    this.processPointerUp();
  };

  private handleTouchStart = (e: TouchEvent) => {
    if (!this.canvas || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left + this.scrollX;
    const y = touch.clientY - rect.top;
    this.processPointerDown(x, y, touch.clientX);
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (!this.canvas || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left + this.scrollX;
    const y = touch.clientY - rect.top;
    this.processPointerMove(x, y, touch.clientX);
  };

  private handleTouchEnd = () => {
    this.processPointerUp();
  };

  private processPointerDown(x: number, y: number, screenX: number): void {
    let hitModule = false;

    for (const module of this.modules) {
      const px = module.x * this.cellW;
      const py = module.y * this.cellH;
      const pw = module.w * this.cellW;
      const ph = module.h * this.cellH;

      if (x >= px && x <= px + pw && y >= py && y <= py + ph) {
        if (module.handlePointerDown(x, y, px, py, pw, ph)) {
          this.activeDragModule = module;
          hitModule = true;
          break;
        }
      }
    }

    if (!hitModule && this.maxScrollX > 0) {
      this.isPanning = true;
      this.panStartX = screenX;
      this.panStartScrollX = this.scrollX;
    }
  }

  private processPointerMove(x: number, y: number, screenX: number): void {
    if (this.activeDragModule) {
      const px = this.activeDragModule.x * this.cellW;
      const py = this.activeDragModule.y * this.cellH;
      const pw = this.activeDragModule.w * this.cellW;
      const ph = this.activeDragModule.h * this.cellH;
      this.activeDragModule.handlePointerMove(x, y, px, py, pw, ph);
    } else if (this.isPanning) {
      const dx = screenX - this.panStartX;
      this.scrollX = Math.max(0, Math.min(this.maxScrollX, this.panStartScrollX - dx));
    }
  }

  private processPointerUp(): void {
    if (this.activeDragModule) {
      const px = this.activeDragModule.x * this.cellW;
      const py = this.activeDragModule.y * this.cellH;
      const pw = this.activeDragModule.w * this.cellW;
      const ph = this.activeDragModule.h * this.cellH;
      this.activeDragModule.handlePointerUp(0, 0, px, py, pw, ph);
      this.activeDragModule = null;
    }
    this.isPanning = false;
  }

  public resize(width: number, height: number): void {
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.setupLayout();
  }

  public pause(): void {}

  public resume(): void {}

  public destroy(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this.canvas.removeEventListener('mouseup', this.handleMouseUp);

      this.canvas.removeEventListener('touchstart', this.handleTouchStart);
      this.canvas.removeEventListener('touchmove', this.handleTouchMove);
      this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    }
    this.modules.forEach(m => m.destroy());
    this.modules = [];
  }
}
