import type { BusyBoardModule } from '../BusyBoardModule';
import { AudioController } from '../../../core/AudioController';
import type { IAudioEngine } from '../../../core/IAudioEngine';
import { HapticController } from '../../../core/HapticController';

export abstract class BaseBusyBoardModule implements BusyBoardModule {
  public id: string;
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  protected get audio(): IAudioEngine {
    if ((this as any).game?.getAudioController) {
      return (this as any).game.getAudioController();
    }
    return AudioController.getInstance();
  }

  protected readonly haptics = HapticController.getInstance();

  constructor(id: string, x: number, y: number, w: number, h: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  public init(): void {
    // Default no-op
  }

  public abstract render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void;

  public abstract handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean;

  public handlePointerMove(_x: number, _y: number, _px: number, _py: number, _pw: number, _ph: number): void {
    // Default no-op
  }

  public handlePointerUp(_x: number, _y: number, _px: number, _py: number, _pw: number, _ph: number): void {
    // Default no-op
  }

  public setPowerState(_hasPower: boolean): void {
    // Default no-op
  }

  public destroy(): void {
    // Default no-op
  }
}
