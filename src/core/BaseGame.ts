import type { Game } from './Game';
import { AudioController } from './AudioController';
import { HapticController } from './HapticController';

export abstract class BaseGame implements Game {
  protected readonly audio = AudioController.getInstance();
  protected readonly haptics = HapticController.getInstance();
  
  protected canvas: HTMLCanvasElement | null = null;
  protected ctx: CanvasRenderingContext2D | null = null;

  public init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    // We try to get context, but for DOM games it's fine if they ignore it
    this.ctx = canvas.getContext('2d');
    this.onInit();
  }

  /**
   * Override this method to perform game-specific initialization.
   * The `canvas` and `ctx` properties will already be set.
   */
  protected onInit(): void {}

  public abstract update(dt: number): void;
  public abstract destroy(): void;
}
