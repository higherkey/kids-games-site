import { BaseGame } from '../../core/BaseGame';
import type { BusyBoardModule } from './BusyBoardModule';

export abstract class BaseBusyBoardGame extends BaseGame {

  protected modules: BusyBoardModule[] = [];
  protected activeDragModule: BusyBoardModule | null = null;

  // Layout parameters
  protected cols = 4;
  protected rows = 3;
  protected cellW = 0;
  protected cellH = 0;

  // Scrolling state
  protected scrollX = 0;
  protected maxScrollX = 0;
  protected isPanning = false;
  protected panStartX = 0;
  protected panStartScrollX = 0;

  protected onInit(): void {
    if (!this.canvas) return;

    this.setupLayout();
    this.setupModules();

    // Event listeners
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);

    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
  }

  protected setupLayout(): void {
    if (!this.canvas) return;

    // Minimum column width of 300px prevents modules from getting squished on narrow viewports
    this.cellW = Math.max(300, this.canvas.width / this.cols);
    this.cellH = this.canvas.height / this.rows;

    const boardWidth = this.cols * this.cellW;
    this.maxScrollX = Math.max(0, boardWidth - this.canvas.width);
    this.scrollX = Math.min(this.scrollX, this.maxScrollX);
  }

  protected abstract setupModules(): void;

  public abstract update(dt: number): void;

  public resize(_width: number, _height: number): void {
    this.setupLayout();
  }

  public destroy(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this.canvas.removeEventListener('mouseup', this.handleMouseUp);
      this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);

      this.canvas.removeEventListener('touchstart', this.handleTouchStart);
      this.canvas.removeEventListener('touchmove', this.handleTouchMove);
      this.canvas.removeEventListener('touchend', this.handleTouchEnd);
      this.canvas.removeEventListener('touchcancel', this.handleTouchCancel);
      this.canvas = null;
    }

    this.modules.forEach(mod => mod.destroy());
    this.modules = [];
  }

  protected drawScrollIndicators(): void {
    if (!this.ctx || !this.canvas) return;

    const arrowColor = this.getScrollArrowColor();
    const size = 15;
    const centerY = this.canvas.height / 2;

    // Left indicator
    if (this.scrollX > 10) {
      this.ctx.save();
      this.ctx.fillStyle = arrowColor;
      this.ctx.beginPath();
      this.ctx.moveTo(20, centerY);
      this.ctx.lineTo(35, centerY - size);
      this.ctx.lineTo(35, centerY + size);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }

    // Right indicator
    if (this.scrollX < this.maxScrollX - 10) {
      this.ctx.save();
      this.ctx.fillStyle = arrowColor;
      this.ctx.beginPath();
      this.ctx.moveTo(this.canvas.width - 20, centerY);
      this.ctx.lineTo(this.canvas.width - 35, centerY - size);
      this.ctx.lineTo(this.canvas.width - 35, centerY + size);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  protected abstract getScrollArrowColor(): string;

  protected drawGridLines(strokeColor: string, lineWidth = 4): void {
    if (!this.ctx) return;
    this.ctx.save();
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = lineWidth;

    // Vertical grid line segments (skipping boundaries inside multi-cell modules)
    for (let c = 1; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const spansColumn = this.modules.some(mod =>
          mod.x < c && (mod.x + mod.w) > c && mod.y <= r && (mod.y + mod.h) > r
        );
        if (!spansColumn) {
          this.ctx.beginPath();
          this.ctx.moveTo(c * this.cellW, r * this.cellH);
          this.ctx.lineTo(c * this.cellW, (r + 1) * this.cellH);
          this.ctx.stroke();
        }
      }
    }

    // Horizontal grid line segments (skipping boundaries inside multi-cell modules)
    for (let r = 1; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const spansRow = this.modules.some(mod =>
          mod.y < r && (mod.y + mod.h) > r && mod.x <= c && (mod.x + mod.w) > c
        );
        if (!spansRow) {
          this.ctx.beginPath();
          this.ctx.moveTo(c * this.cellW, r * this.cellH);
          this.ctx.lineTo((c + 1) * this.cellW, r * this.cellH);
          this.ctx.stroke();
        }
      }
    }

    this.ctx.restore();
  }

  protected getModuleRenderBox(mod: BusyBoardModule) {
    const px = mod.x * this.cellW;
    const py = mod.y * this.cellH;
    const availW = mod.w * this.cellW;
    const availH = mod.h * this.cellH;

    const targetAspect = mod.w / mod.h;
    const availAspect = availW / availH;

    let rw = availW;
    let rh = availH;
    let rx = px;
    let ry = py;

    if (availAspect > targetAspect) {
      rw = availH * targetAspect;
      rx = px + (availW - rw) / 2;
    } else {
      rh = availW / targetAspect;
      ry = py + (availH - rh) / 2;
    }

    return { x: rx, y: ry, w: rw, h: rh };
  }

  // Pointer coordination helpers
  private readonly handleMouseDown = (e: MouseEvent) => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.processPointerDown(x, y);
  };

  private readonly handleMouseMove = (e: MouseEvent) => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.processPointerMove(x, y);
  };

  private readonly handleMouseUp = (e: MouseEvent) => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.processPointerUp(x, y);
  };

  private readonly handleTouchStart = (e: TouchEvent) => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    this.processPointerDown(x, y);
  };

  private readonly handleTouchMove = (e: TouchEvent) => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    this.processPointerMove(x, y);
  };

  private readonly handleTouchEnd = (e: TouchEvent) => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    this.processPointerUp(x, y);
  };

  private readonly handleMouseLeave = () => {
    this.processPointerCancel();
  };

  private readonly handleTouchCancel = () => {
    this.processPointerCancel();
  };

  protected processPointerDown(x: number, y: number) {
    this.activeDragModule = null;
    this.isPanning = false;

    const worldX = x + this.scrollX;

    for (const mod of this.modules) {
      const box = this.getModuleRenderBox(mod);

      if (mod.handlePointerDown(worldX, y, box.x, box.y, box.w, box.h)) {
        this.activeDragModule = mod;
        break;
      }
    }

    if (!this.activeDragModule && this.maxScrollX > 0) {
      this.isPanning = true;
      this.panStartX = x;
      this.panStartScrollX = this.scrollX;
    }
  }

  protected processPointerMove(x: number, y: number) {
    const worldX = x + this.scrollX;

    if (this.activeDragModule) {
      const box = this.getModuleRenderBox(this.activeDragModule);
      this.activeDragModule.handlePointerMove(worldX, y, box.x, box.y, box.w, box.h);
    } else if (this.isPanning && this.maxScrollX > 0) {
      const dx = x - this.panStartX;
      this.scrollX = Math.max(0, Math.min(this.maxScrollX, this.panStartScrollX - dx));
    }
  }

  protected processPointerUp(x: number, y: number) {
    if (this.activeDragModule) {
      const box = this.getModuleRenderBox(this.activeDragModule);
      const worldX = x + this.scrollX;
      this.activeDragModule.handlePointerUp(worldX, y, box.x, box.y, box.w, box.h);
      this.activeDragModule = null;
    }
    this.isPanning = false;
  }

  protected processPointerCancel() {
    if (this.activeDragModule) {
      const box = this.getModuleRenderBox(this.activeDragModule);
      this.activeDragModule.handlePointerUp(-999, -999, box.x, box.y, box.w, box.h);
      this.activeDragModule = null;
    }
    this.isPanning = false;
  }
}
