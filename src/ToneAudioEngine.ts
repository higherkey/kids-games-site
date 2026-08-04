import { ToneAudioController, type LightBoardAudioParams } from './core/ToneAudioController';

export type { LightBoardAudioParams };

export class ToneAudioEngine {
  public static getInstance(): ToneAudioController {
    return ToneAudioController.getInstance();
  }
}