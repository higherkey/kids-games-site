import { Icons } from './Icons';
import './GameHeader.css';

export interface GameHeaderConfig {
  gameName: string;
  onHome: () => void;
  onMenuToggle: () => void;
}

/**
 * GameHeader - A reusable header component for all games.
 * Displays a home button/logo on the left and a menu toggle on the right.
 */
export class GameHeader {
  private readonly element: HTMLElement;
  private readonly config: GameHeaderConfig;

  constructor(config: GameHeaderConfig) {
    this.config = config;
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const header = document.createElement('header');
    header.id = 'game-header';
    header.className = 'game-header';
    
    header.innerHTML = `
      <button class="header-btn home-btn" title="Go Home" aria-label="Go Home">
        <span class="header-icon">${Icons.home}</span>
        <span class="header-logo">Kipu</span>
      </button>
      <span class="header-title">${this.config.gameName}</span>
      <button class="header-btn menu-btn" title="Menu" aria-label="Open Menu">
        <span class="header-icon">${Icons.menu}</span>
      </button>
    `;

    // Event listeners
    header.querySelector('.home-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.config.onHome();
    });
    
    header.querySelector('.menu-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.config.onMenuToggle();
    });

    // Prevent touch events from propagating to game
    header.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    header.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
    header.addEventListener('touchend', (e) => e.stopPropagation(), { passive: true });

    return header;
  }

  public mount(container: HTMLElement = document.body): void {
    const existing = document.getElementById('game-header');
    if (existing) existing.remove();
    
    // Insert at the beginning of the container
    container.insertBefore(this.element, container.firstChild);
  }

  public unmount(): void {
    this.element.remove();
  }

  public setGameName(name: string): void {
    this.config.gameName = name;
    const titleEl = this.element.querySelector('.header-title');
    if (titleEl) titleEl.textContent = name;
  }

  public show(): void {
    this.element.classList.remove('hidden');
  }

  public hide(): void {
    this.element.classList.add('hidden');
  }
}
