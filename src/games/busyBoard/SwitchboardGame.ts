import { BaseBusyBoardGame } from './BaseBusyBoardGame';
import { BoardModuleRegistry } from './BoardModuleRegistry';
import { AudioController } from '../../core/AudioController';

export class SwitchboardGame extends BaseBusyBoardGame {
  // Shake effect state
  private shakeDuration = 0; // remaining shake time in ms
  private shakeIntensity = 0;
  private shakeX = 0;
  private shakeY = 0;

  // Global power state
  private hasPower = true;

  public override init(canvas: HTMLCanvasElement): void {
    // Register high-fidelity mechanical click/clack sounds
    const audio = AudioController.getInstance();
    audio.registerSound('busyboard:arcade_button', '/sounds/busyBoard/arcade_button.wav');
    audio.registerSound('busyboard:breaker_flip', '/sounds/busyBoard/breaker_flip.wav');
    audio.registerSound('busyboard:dip', '/sounds/busyBoard/dip.wav');
    audio.registerSound('busyboard:key_turn', '/sounds/busyBoard/key_turn.wav');
    audio.registerSound('busyboard:knife_close', '/sounds/busyBoard/knife_close.wav');
    audio.registerSound('busyboard:knife_open', '/sounds/busyBoard/knife_open.wav');
    audio.registerSound('busyboard:pedal_thud', '/sounds/busyBoard/pedal_thud.wav');
    audio.registerSound('busyboard:pull_cord', '/sounds/busyBoard/pull_cord.wav');
    audio.registerSound('busyboard:push_button', '/sounds/busyBoard/push_button.wav');
    audio.registerSound('busyboard:rocker_off', '/sounds/busyBoard/rocker_off.wav');
    audio.registerSound('busyboard:rocker_on', '/sounds/busyBoard/rocker_on.wav');
    audio.registerSound('busyboard:toggle_off', '/sounds/busyBoard/toggle_off.wav');
    audio.registerSound('busyboard:toggle_on', '/sounds/busyBoard/toggle_on.wav');

    super.init(canvas);
  }

  protected override setupModules() {
    this.modules = [];

    // Define coordinates in grid cells [col, row, width, height]
    const layouts = [
      { id: '010', col: 0, row: 0, w: 1, h: 2 }, // BreakerLever (Double-height)
      { id: '006', col: 0, row: 2, w: 1, h: 1 }, // PushLatchButton
      
      { id: '001', col: 1, row: 0, w: 1, h: 1 }, // RockerSwitch
      { id: '002', col: 1, row: 1, w: 1, h: 1 }, // IndustrialToggle
      { id: '003', col: 1, row: 2, w: 1, h: 1 }, // KnifeSwitch
 
      { id: '004', col: 2, row: 0, w: 1, h: 1 }, // DIPArray
      { id: '005', col: 2, row: 1, w: 1, h: 1 }, // PullStringCord
      { id: '007', col: 2, row: 2, w: 1, h: 1 }, // KeyRotation
 
      { id: '009', col: 3, row: 0, w: 1, h: 2 }, // HeavyPedal (Double-height)
      { id: '008', col: 3, row: 2, w: 1, h: 1 }, // ArcadeDome
    ];

    layouts.forEach(layout => {
      const Constructor = BoardModuleRegistry[layout.id];
      if (!Constructor) {
        console.warn(`Module constructor for ID ${layout.id} not found.`);
        return;
      }

      // Add callbacks depending on module type
      let callback: any = undefined;
      if (layout.id === '010') {
        // Breaker Lever controls power state of all other modules
        callback = (hasPower: boolean) => this.setPowerState(hasPower);
      } else if (layout.id === '009') {
        // Heavy pedal triggers screen shake
        callback = () => this.triggerShake(400, 8);
      }

      const instance = new Constructor(
        layout.id,
        layout.col,
        layout.row,
        layout.w,
        layout.h,
        callback
      );
      instance.init();
      this.modules.push(instance);
    });
  }

  private setPowerState(hasPower: boolean) {
    this.hasPower = hasPower;
    this.modules.forEach(mod => {
      if (mod.id !== '010' && mod.setPowerState) {
        mod.setPowerState(hasPower);
      }
    });
  }

  private triggerShake(durationMs: number, intensity: number) {
    this.shakeDuration = durationMs;
    this.shakeIntensity = intensity;
  }

  public override update(dt: number): void {
    // Check if heavy pedal is pressed to continue screen shake
    const pedal = this.modules.find(m => m.id === '009') as any;
    if (pedal?.isPressed) {
      this.shakeDuration = 100;
      this.shakeIntensity = 8;
    }

    // Process screen shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeX = 0;
        this.shakeY = 0;
      } else {
        this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
        this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      }
    }

    this.render();
  }

  private render() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctxSaveAndApplyShake(this.ctx, this.shakeX, this.shakeY);

    // Apply horizontal translation for scrolling
    this.ctx.save();
    this.ctx.translate(-this.scrollX, 0);

    const boardWidth = this.cols * this.cellW;

    // Draw grid background texture (Parchment/wooden board style borders)
    this.ctx.fillStyle = '#E3D7C1'; // Darker background behind modules
    this.ctx.fillRect(0, 0, boardWidth, this.canvas.height);

    // Draw module grid dividing lines (skipping boundaries inside multi-cell modules)
    this.drawGridLines('#C4B599', 4);

    // Render modules
    this.modules.forEach(mod => {
      const box = this.getModuleRenderBox(mod);
      mod.render(this.ctx!, box.x, box.y, box.w, box.h);
    });

    this.ctx.restore(); // Restore translation

    // Draw visual hints if the board can scroll
    this.drawScrollIndicators();

    this.ctx.restore(); // Restore shake translation
  }

  protected override getScrollArrowColor(): string {
    return 'rgba(43, 45, 94, 0.4)';
  }
}

function ctxSaveAndApplyShake(ctx: CanvasRenderingContext2D, shakeX: number, shakeY: number) {
  ctx.save();
  if (shakeX !== 0 || shakeY !== 0) {
    ctx.translate(shakeX, shakeY);
  }
}
