export interface Game {
  /**
   * Initializes the game.
   * @param canvas The canvas element to render onto.
   */
  init(canvas: HTMLCanvasElement): void;

  /**
   * Updates game state and renders.
   * @param dt Delta time in milliseconds.
   */
  update(dt: number): void;

  /**
   * Pauses the game.
   */
  pause?(): void;

  /**
   * Resumes the game from a paused state.
   */
  resume?(): void;

  /**
   * Cleans up resources, event listeners, etc.
   */
  destroy(): void;

  /**
   * Optional callback when canvas/container is resized.
   */
  resize?(width: number, height: number): void;

  /**
   * Optional callback when sound settings change.
   */
  setSoundEnabled?(enabled: boolean): void;

  /**
   * Optional callback when vibration settings change.
   */
  setVibrationEnabled?(enabled: boolean): void;
}

