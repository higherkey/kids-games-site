import { BaseBusyBoardGame } from './BaseBusyBoardGame';
import { BoardModuleRegistry } from './BoardModuleRegistry';
import { AudioController } from '../../core/AudioController';

export class MechanicalWorkshopGame extends BaseBusyBoardGame {
  public override init(canvas: HTMLCanvasElement): void {
    // Register click/ticking sounds if needed
    const audio = AudioController.getInstance();
    audio.registerSound('busyboard:toggle_on', '/sounds/busyBoard/toggle_on.wav');
    audio.registerSound('busyboard:toggle_off', '/sounds/busyBoard/toggle_off.wav');
    audio.registerSound('busyboard:dip', '/sounds/busyBoard/dip.wav');
    audio.registerSound('busyboard:key_turn', '/sounds/busyBoard/key_turn.wav');
    audio.registerSound('busyboard:push_button', '/sounds/busyBoard/push_button.wav');

    super.init(canvas);
  }

  protected override setupModules() {
    this.modules = [];

    // Board 3 Layout: [col, row, width, height]
    const layouts = [
      { id: '021', col: 0, row: 0, w: 1, h: 1 }, // GearTrainTrio
      { id: '024', col: 0, row: 1, w: 1, h: 1 }, // BarrelBoltLatch
      { id: '025', col: 0, row: 2, w: 1, h: 1 }, // SpringDoorstop

      { id: '022', col: 1, row: 0, w: 1, h: 1 }, // Two-Prong Outlet
      { id: '027', col: 1, row: 1, w: 1, h: 1 }, // HeavyHandCrank
      { id: '030', col: 1, row: 2, w: 1, h: 1 }, // ThreadedScrew

      { id: '023', col: 2, row: 0, w: 1, h: 2 }, // 3.5mm Audio Jack (Double height)
      { id: '028', col: 2, row: 2, w: 1, h: 1 }, // Heavy-Duty Zipper

      { id: '026', col: 3, row: 0, w: 1, h: 2 }, // Rotary Telephone (Double height)
      { id: '029', col: 3, row: 2, w: 1, h: 1 }, // TumblerCombination
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

  public override update(_dt: number): void {
    this.render();
  }

  private render() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply horizontal translation for scrolling
    this.ctx.save();
    this.ctx.translate(-this.scrollX, 0);

    const boardWidth = this.cols * this.cellW;

    // Draw main background color - Wooden workshop theme
    this.ctx.fillStyle = '#D7CCC8'; // light wood/corkboard color
    this.ctx.fillRect(0, 0, boardWidth, this.canvas.height);

    // Draw module grid dividing lines (skipping boundaries inside multi-cell modules)
    this.drawGridLines('#BCAE97', 4);

    // Render modules
    this.modules.forEach(mod => {
      const box = this.getModuleRenderBox(mod);
      mod.render(this.ctx!, box.x, box.y, box.w, box.h);
    });

    this.ctx.restore(); // Restore scroll translation

    // Draw visual hints if the board can scroll
    this.drawScrollIndicators();
  }

  protected override getScrollArrowColor(): string {
    return 'rgba(90, 86, 76, 0.4)';
  }
}
