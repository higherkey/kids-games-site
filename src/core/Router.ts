export type RouteHandler = (params?: Record<string, string>) => void;

/**
 * Simple client-side router for Kipu.
 * Handles URL navigation using the History API.
 */
export class Router {
  private readonly routes: Map<string, RouteHandler> = new Map();

  constructor() {
    window.addEventListener('popstate', () => {
      this.handleRoute(window.location.pathname);
    });

    // Intercept internal link clicks
    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (
        link &&
        link instanceof HTMLAnchorElement &&
        link.origin === window.location.origin &&
        !link.hasAttribute('download') &&
        link.target !== '_blank'
      ) {
        e.preventDefault();
        this.navigate(link.pathname);
      }
    });
  }

  /**
   * Registers a handler for a specific path.
   * Supports exact matches and a special '/game/:id' pattern.
   */
  public addRoute(path: string, handler: RouteHandler): void {
    this.routes.set(path, handler);
  }

  /**
   * Navigates to a new path.
   * @param path The URL path to navigate to.
   * @param pushState Whether to add a new entry to the browser history.
   */
  public navigate(path: string, pushState: boolean = true): void {
    if (pushState) {
      window.history.pushState({}, '', path);
    }
    this.handleRoute(path);
  }

  /**
   * Initializes the router and handles the current URL.
   */
  public init(): void {
    this.handleRoute(window.location.pathname);
  }

  private handleRoute(path: string): void {
    const matched = this.matchRoute(path);
    if (matched) {
      matched.handler(matched.params);
      return;
    }

    // Default: Fallback to Not Found if no match
    const notFoundHandler = this.routes.get('*');
    if (notFoundHandler) {
      notFoundHandler();
      return;
    }

    // Ultimate fallback to root
    const rootHandler = this.routes.get('/');
    if (rootHandler) {
      if (path !== '/') {
        window.history.replaceState({}, '', '/');
      }
      rootHandler();
    }
  }

  private matchRoute(path: string): { handler: RouteHandler; params?: Record<string, string> } | null {
    // Exact match
    const exactHandler = this.routes.get(path);
    if (exactHandler) {
      return { handler: exactHandler };
    }

    // Dynamic game route: /game/[id]
    if (path.startsWith('/game/')) {
      const gameId = path.substring(6);
      const handler = gameId ? this.routes.get('/game/:id') : null;
      if (handler) {
        return { handler, params: { id: gameId } };
      }
    }

    // Dynamic portal route: /portal/[id]
    if (path.startsWith('/portal/')) {
      const portalId = path.substring(8);
      const handler = portalId ? this.routes.get('/portal/:portalId') : null;
      if (handler) {
        return { handler, params: { portalId } };
      }
    }

    return null;
  }
}
