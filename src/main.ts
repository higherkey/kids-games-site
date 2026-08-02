import './style.css';
import './ui/NotFound.css';
import { registerSW } from 'virtual:pwa-register';
import { Icons } from './ui/Icons';
import { IdleManager } from './core/IdleManager';
import { GameUI } from './ui/GameUI';
import type { Game } from './core/Game';
import { GameLoop } from './core/GameLoop';
import { Router } from './core/Router';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { AudioController } from './core/AudioController';
import { GameRegistry } from './core/GameRegistry';

// PWA Support
registerSW({
  onNeedRefresh() {
    console.log('New content available, click on reload button to update.');
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

// Game State
let activeGame: Game | null = null;
let activeGameId: string | null = null;
let gameLoop: GameLoop | null = null;
let gameUI: GameUI | null = null;
let idleManager: IdleManager | null = null;
let router: Router | null = null;
let loadingOverlay: LoadingOverlay | null = null;
let currentResizeHandler: (() => void) | null = null;

// Settings State (persisted in localStorage)
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
let vibrationEnabled = localStorage.getItem('vibrationEnabled') !== 'false';


// Featured Games list for rotating banner
const featuredGames = [
  {
    id: 'noButton',
    title: 'Eeno',
    subtitle: 'The "No" Button',
    desc: 'Speak with funny voices and learn standard words in many languages!',
    icon: 'no'
  },
  {
    id: 'bubbleWrap',
    title: 'Poka',
    subtitle: 'Bubble Wrap',
    desc: 'Pop colorful bubbles, hear funny pops, and feel satisfying haptic feedback!',
    icon: 'bubble'
  },
  {
    id: 'marblePipe',
    title: 'Marble Pipe',
    subtitle: 'Marble Run Sandbox',
    desc: 'Build your own physics marble run with ramps, boosters, and bumpers!',
    icon: 'pipe'
  },
  {
    id: 'colorMixer',
    title: 'Maka',
    subtitle: 'Color Mixer',
    desc: 'Drop paint and mix colors by hand in a satisfying open space!',
    icon: 'palette'
  },
  {
    id: 'colorDropper',
    title: 'Sutuy',
    subtitle: 'Color Dropper',
    desc: 'Drop and merge paint drops to mix new colors programmatically!',
    icon: 'droplet'
  }
];

let currentHeroIndex = 0;
let heroInterval: any = null;

document.addEventListener('DOMContentLoaded', () => {
  const navShell = document.getElementById('navigation-shell');
  const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const gameButtons = document.querySelectorAll('#game-list button, #game-list a');

  // Inject Icons into menu items
  gameButtons.forEach(button => {
    const gameId = (button as HTMLElement).dataset.game;
    const iconContainer = button.querySelector('.icon');
    if (iconContainer && gameId) {
      const iconMap: Record<string, string> = {
        noButton: 'no',
        bubbleWrap: 'bubble',
        balloonPop: 'balloon',
        colorMixer: 'palette',
        colorDropper: 'droplet',
        bugCatcher: 'bug',
        soundMemory: 'music',
        marblePipe: 'pipe',
        soundBoard: 'sound',
        particlePhysics: 'particle',
        switchboard: 'settings',
        luminaryBoard: 'bulb',
        luminaryBoardTone: 'bulb',
        mechanicalWorkshop: 'settings',
      };
      const iconKey = iconMap[gameId];
      if (iconKey && iconKey in Icons) {
        iconContainer.innerHTML = Icons[iconKey as keyof typeof Icons];
      }
    }
  });

  // Setup Hero Banner dots indicators
  const dotsContainer = document.getElementById('hero-dots');
  if (dotsContainer) {
    dotsContainer.innerHTML = featuredGames.map((_, i) => `<button class="dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Slide ${i+1}"></button>`).join('');
    
    dotsContainer.querySelectorAll('.dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        const idx = Number.parseInt((e.currentTarget as HTMLElement).dataset.index || '0');
        currentHeroIndex = idx;
        updateHeroBanner();
        startHeroRotation();
      });
    });
  }

  function updateHeroBanner() {
    const hero = featuredGames[currentHeroIndex];
    const heroTitle = document.getElementById('hero-title');
    const heroSubtitle = document.getElementById('hero-subtitle');
    const heroDesc = document.getElementById('hero-desc');
    const heroPlayBtn = document.getElementById('hero-play-btn') as HTMLAnchorElement;
    const heroIconContainer = document.getElementById('hero-icon-container');

    const heroBannerEl = document.getElementById('hero-banner');
    if (heroBannerEl) {
      heroBannerEl.classList.add('fade-transition');
      setTimeout(() => {
        if (heroTitle) heroTitle.textContent = hero.title;
        if (heroSubtitle) heroSubtitle.textContent = hero.subtitle;
        if (heroDesc) heroDesc.textContent = hero.desc;
        if (heroPlayBtn) heroPlayBtn.href = `/game/${hero.id}`;
        if (heroIconContainer && hero.icon in Icons) {
          heroIconContainer.innerHTML = Icons[hero.icon as keyof typeof Icons];
        }

        if (dotsContainer) {
          dotsContainer.querySelectorAll('.dot').forEach((d, i) => {
            d.classList.toggle('active', i === currentHeroIndex);
          });
        }

        heroBannerEl.classList.remove('fade-transition');
      }, 150);
    }
  }

  function startHeroRotation() {
    if (heroInterval) clearInterval(heroInterval);
    heroInterval = setInterval(() => {
      currentHeroIndex = (currentHeroIndex + 1) % featuredGames.length;
      updateHeroBanner();
    }, 5000);
  }

  // Setup global systems
  loadingOverlay = new LoadingOverlay();

  idleManager = new IdleManager(60000, () => {
    if (activeGame && gameUI) {
      gameUI.pause();
      gameUI.openMenu();
    }
  });

  // Global touch prevention on canvas
  if (gameCanvas) {
    gameCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
    }, { passive: false });

    gameCanvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
    }, { passive: false });
  }

  // Setup Router
  router = new Router();

  router.addRoute('/', () => {
    const notFound = document.getElementById('not-found-screen');
    notFound?.classList.add('hidden');

    cleanupActiveGame();
    navShell?.classList.remove('hidden');
    gameCanvas?.classList.add('hidden');
    gameCanvas?.classList.remove('with-hud');

    // Show/hide correct views for homepage
    document.getElementById('portal-list')?.classList.remove('hidden');
    document.getElementById('hero-banner')?.classList.remove('hidden');
    document.getElementById('portal-instruction')?.classList.remove('hidden');
    document.getElementById('game-list')?.classList.add('hidden');
    document.getElementById('back-to-portals-btn')?.classList.add('hidden');

    // Restore default header
    const mainTitle = document.getElementById('main-title');
    const mainTagline = document.getElementById('main-tagline');
    if (mainTitle) mainTitle.textContent = 'Kipu';
    if (mainTagline) mainTagline.textContent = 'Touch. Play. Learn.';

    // Reset portal-specific class
    navShell?.classList.remove('portal-sandbox', 'portal-workshop', 'portal-lab', 'portal-busyBoard');

    // Start hero rotation
    updateHeroBanner();
    startHeroRotation();

    updateTabBarActiveState('/');
  });

  router.addRoute('/portal/:portalId', (params) => {
    const portalId = params?.portalId;
    if (portalId !== 'sandbox' && portalId !== 'workshop' && portalId !== 'lab' && portalId !== 'busyBoard') {
      router?.navigate('*', false);
      return;
    }

    const notFound = document.getElementById('not-found-screen');
    notFound?.classList.add('hidden');

    cleanupActiveGame();

    navShell?.classList.remove('hidden');
    gameCanvas?.classList.add('hidden');
    gameCanvas?.classList.remove('with-hud');

    // Stop hero rotation
    if (heroInterval) {
      clearInterval(heroInterval);
      heroInterval = null;
    }

    // Toggle views: hide hero, hide portals list, show games list
    document.getElementById('hero-banner')?.classList.add('hidden');
    document.getElementById('portal-instruction')?.classList.add('hidden');
    document.getElementById('portal-list')?.classList.add('hidden');
    
    const gameListEl = document.getElementById('game-list');
    if (gameListEl) {
      gameListEl.classList.remove('hidden');
    }

    // Filter games by portal
    const gameCards = document.querySelectorAll('#game-list a');
    gameCards.forEach(card => {
      const cardPortal = (card as HTMLElement).dataset.portal;
      if (cardPortal === portalId) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });

    // Update Header and show Back Button
    const mainTitle = document.getElementById('main-title');
    const mainTagline = document.getElementById('main-tagline');
    const backBtn = document.getElementById('back-to-portals-btn');

    if (backBtn) backBtn.classList.remove('hidden');

    const portalTitles: Record<string, string> = {
      sandbox: 'Sandbox',
      workshop: 'Workshop',
      lab: 'Lab',
      busyBoard: 'Busy Board'
    };
    const portalTaglines: Record<string, string> = {
      sandbox: 'Sensory & Kinetic Exploration',
      workshop: 'Guided Creation & Sequencing',
      lab: 'Physics & Logic Challenges',
      busyBoard: 'Tactile Switchboards'
    };

    if (mainTitle) mainTitle.textContent = portalTitles[portalId];
    if (mainTagline) mainTagline.textContent = portalTaglines[portalId];

    // Set portal class
    navShell?.classList.remove('portal-sandbox', 'portal-workshop', 'portal-lab', 'portal-busyBoard');
    navShell?.classList.add(`portal-${portalId}`);

    updateTabBarActiveState(`/portal/${portalId}`);
  });

  router.addRoute('/game/:id', (params) => {
    const gameId = params?.id;
    const registry = GameRegistry.getInstance();
    
    if (!gameId || !registry.get(gameId)) {
      router?.navigate('*', false);
      return;
    }

    // Stop hero rotation
    if (heroInterval) {
      clearInterval(heroInterval);
      heroInterval = null;
    }

    const notFound = document.getElementById('not-found-screen');
    notFound?.classList.add('hidden');

    // Show loading overlay with grace period
    loadingOverlay?.show(200);

    navShell?.classList.add('hidden');
    gameCanvas?.classList.remove('hidden');
    gameCanvas?.classList.add('with-hud');

    resizeCanvas(gameCanvas);
    
    if (currentResizeHandler) {
      window.removeEventListener('resize', currentResizeHandler);
    }
    currentResizeHandler = () => {
      resizeCanvas(gameCanvas);
      if (activeGame?.resize) {
        activeGame.resize(gameCanvas.width, gameCanvas.height);
      }
    };
    window.addEventListener('resize', currentResizeHandler);

    startGame(gameId, gameCanvas);

    setTimeout(() => loadingOverlay?.hide(), 500);

    updateTabBarActiveState(`/game/${gameId}`);
  });

  router.addRoute('*', () => {
    cleanupActiveGame();

    navShell?.classList.add('hidden');
    gameCanvas?.classList.add('hidden');

    let notFound = document.getElementById('not-found-screen');
    if (!notFound) {
      notFound = document.createElement('div');
      notFound.id = 'not-found-screen';
      notFound.className = 'not-found-container';
      notFound.innerHTML = `
        <h2>404</h2>
        <p>This game could not be found.</p>
        <a href="/" class="back-home-btn">Go Back Home</a>
      `;
      document.getElementById('app')?.appendChild(notFound);
    } else {
      notFound.classList.remove('hidden');
    }

    updateTabBarActiveState('*');
  });

  function updateTabBarActiveState(currentPath: string) {
    const tabBar = document.getElementById('mobile-tab-bar');
    if (!tabBar) return;

    const isGame = currentPath.startsWith('/game/');
    const notFoundEl = document.getElementById('not-found-screen');
    const isNotFound = notFoundEl && !notFoundEl.classList.contains('hidden');
    
    if (isGame || isNotFound || currentPath === '*') {
      tabBar.classList.add('hidden');
    } else {
      tabBar.classList.remove('hidden');
    }

    let activeTab = 'home';
    if (currentPath.startsWith('/portal/')) {
      activeTab = currentPath.substring(8);
    } else if (currentPath !== '/') {
      activeTab = '';
    }

    tabBar.querySelectorAll('.tab-item').forEach(item => {
      const tabName = (item as HTMLElement).dataset.tab;
      if (tabName === activeTab) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  router.init();
});

function startGame(gameId: string, canvas: HTMLCanvasElement) {
  activeGameId = gameId;
  // Clear previous game if any
  if (activeGame) activeGame.destroy();
  if (gameUI) gameUI.unmount();

  const registry = GameRegistry.getInstance();
  const gameInfo = registry.get(gameId);
  if (!gameInfo) {
    console.warn(`Unknown game: ${gameId}`);
    return;
  }

  const gameName = gameInfo.name;

  // Create the unified Game UI
  gameUI = new GameUI({
    gameName,
    onHome: () => exitToHome(),
    onPause: () => pauseGame(),
    onResume: () => resumeGame(),
    onRestart: () => restartGame(gameId, canvas),
    soundEnabled,
    vibrationEnabled,
    onSoundToggle: (enabled) => {
      soundEnabled = enabled;
      localStorage.setItem('soundEnabled', String(enabled));
      // Notify active game of sound setting change
      if (activeGame?.setSoundEnabled) {
        activeGame.setSoundEnabled(enabled);
      }
      // Update global audio controller mute state
      AudioController.getInstance().updateMuteState();
    },
    onVibrationToggle: (enabled) => {
      vibrationEnabled = enabled;
      localStorage.setItem('vibrationEnabled', String(enabled));
      // Notify active game of vibration setting change
      if (activeGame?.setVibrationEnabled) {
        activeGame.setVibrationEnabled(enabled);
      }
    },
  });
  gameUI.mount();

  // Instantiate selected game
  activeGame = new gameInfo.constructorRef();

  activeGame.init(canvas);
  
  gameLoop = new GameLoop((dt) => {
    if (activeGame) activeGame.update(dt);
  });
  gameLoop.start();
  idleManager?.start();
}

function pauseGame() {
  activeGame?.pause?.();
  gameLoop?.stop();
}

function resumeGame() {
  activeGame?.resume?.();
  gameLoop?.start();
  idleManager?.start();
}

function restartGame(gameId: string, canvas: HTMLCanvasElement) {
  if (activeGame) activeGame.destroy();
  activeGame = null;
  gameLoop?.stop();
  
  // Start the same game again
  startGame(gameId, canvas);
}

function exitToHome() {
  if (activeGameId) {
    const registry = GameRegistry.getInstance();
    const gameInfo = registry.get(activeGameId);
    if (gameInfo?.portal) {
      router?.navigate(`/portal/${gameInfo.portal}`);
      return;
    }
  }
  router?.navigate('/');
}

function cleanupActiveGame() {
  if (activeGame) {
    activeGame.destroy();
    activeGame = null;
  }
  activeGameId = null;
  gameLoop?.stop();
  gameLoop = null;
  gameUI?.unmount();
  gameUI = null;
  idleManager?.stop();
  
  if (currentResizeHandler) {
    window.removeEventListener('resize', currentResizeHandler);
    currentResizeHandler = null;
  }
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  canvas.width = window.innerWidth;
  // Account for HUD height
  canvas.height = window.innerHeight - 60;
}

