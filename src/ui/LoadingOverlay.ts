/**
 * LoadingOverlay provides a visual transition during game loading.
 * Implements a "grace period" to avoid flickering for fast loads.
 */
import './LoadingOverlay.css';

export class LoadingOverlay {
  private readonly element: HTMLElement;
  private timeoutId: number | null = null;
  private isVisible: boolean = false;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'loading-overlay hidden';
    this.element.innerHTML = `
      <div class="loader-content">
        <div class="bouncy-ball"></div>
        <p aria-live="polite">Kipu is loading...</p>
      </div>
    `;
    document.body.appendChild(this.element);
  }

  /**
   * Shows the overlay after a grace period.
   * @param gracePeriodMs Time to wait before showing the loader (default 300ms).
   */
  public show(gracePeriodMs: number = 300): void {
    if (this.isVisible || this.timeoutId !== null) return;

    this.timeoutId = window.setTimeout(() => {
      this.element.classList.remove('hidden');
      this.element.classList.add('fade-in');
      this.isVisible = true;
      this.timeoutId = null;
    }, gracePeriodMs);
  }

  /**
   * Hides the overlay immediately and clears any pending show timer.
   */
  public hide(): void {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.element.classList.add('hidden');
    this.element.classList.remove('fade-in');
    this.isVisible = false;
  }
}
