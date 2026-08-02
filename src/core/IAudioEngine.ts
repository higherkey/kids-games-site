export interface IAudioEngine {
  play(id: string, arg?: string | number): void;
  startGlide(id: string, instrument: string, initialFreq: number, volume?: number, pan?: number): void;
  updateGlide(id: string, targetFreq: number, volume?: number, pan?: number): void;
  stopGlide(id: string): void;
}
