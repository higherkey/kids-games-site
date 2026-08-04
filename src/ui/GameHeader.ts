import { Icons } from './Icons';
import './GameHeader.css';

export interface GameHeaderConfig {
  gameName: string;
  portalId?: string;
  portalName?: string;
  onPortalBack?: () => void;
  onHome: () => void;
  onMenuToggle: () => void;
}

/**
 * GameHeader - A reusable header component for all games.
 * Displays intelligent back-to-portal and home navigation on the left, and settings menu toggle on the right.
 */
export class GameHeader {
  private element: HTMLElement;
  private config: GameHeaderConfig;

  constructor(config: GameHeaderConfig) {
    this.config = config;
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const header = document.createElement('header');
    header.id = 'game-header';
    header.className = 'game-header';
    
    const portalName = this.config.portalName || 'Portal';
    const hasPortalBack = !!this.config.onPortalBack;

    header.innerHTML = `
      <div class="header-nav-left">
        ${hasPortalBack ? `
          <button class="header-btn portal-back-btn" title="Back to ${portalName}" aria-label="Back to ${portalName}">
            <span class="header-icon">${Icons.back}</span>
            <span class="header-label">${portalName}</span>
          </button>
        ` : ''}
        <button class="header-btn home-btn" title="Go Home" aria-label="Go Home">
          <span class="header-icon">${Icons.home}</span>
        </button>
      </div>
      <span class="header-title">${this.config.gameName}</span>
      <button class="header-btn menu-btn" title="Menu" aria-label="Open Menu">
        <span class="header-icon">${Icons.menu}</span>
      </button>
    `;

    // Event listeners
    if (hasPortalBack) {
      header.querySelector('.portal-back-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.config.onPortalBack?.();
      });
    }

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
