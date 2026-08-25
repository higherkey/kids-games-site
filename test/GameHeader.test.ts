import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameHeader } from '../src/ui/GameHeader';

describe('GameHeader', () => {
  let header: GameHeader;
  let onPortalBack: () => void;
  let onHome: () => void;
  let onMenuToggle: () => void;

  beforeEach(() => {
    onPortalBack = vi.fn();
    onHome = vi.fn();
    onMenuToggle = vi.fn();

    header = new GameHeader({
      gameName: 'Test Game',
      portalId: 'sandbox',
      portalName: 'Sandbox',
      onPortalBack,
      onHome,
      onMenuToggle,
    });
    document.body.innerHTML = '';
    header.mount(document.body);
  });

  it('should render game title and portal back button', () => {
    const el = document.getElementById('game-header');
    expect(el).not.toBeNull();

    const titleEl = el?.querySelector('.header-title');
    expect(titleEl?.textContent).toBe('Test Game');

    const portalBtn = el?.querySelector('.portal-back-btn');
    expect(portalBtn?.textContent).toContain('Sandbox');
  });

  it('should trigger onPortalBack when portal back button is clicked', () => {
    const portalBtn = document.querySelector('.portal-back-btn') as HTMLButtonElement;
    portalBtn.click();
    expect(onPortalBack).toHaveBeenCalledTimes(1);
  });

  it('should trigger onHome when home button is clicked', () => {
    const homeBtn = document.querySelector('.home-btn') as HTMLButtonElement;
    homeBtn.click();
    expect(onHome).toHaveBeenCalledTimes(1);
  });

  it('should trigger onMenuToggle when menu button is clicked', () => {
    const menuBtn = document.querySelector('.menu-btn') as HTMLButtonElement;
    menuBtn.click();
    expect(onMenuToggle).toHaveBeenCalledTimes(1);
  });

  it('should unmount cleanly', () => {
    header.unmount();
    expect(document.getElementById('game-header')).toBeNull();
  });
});
