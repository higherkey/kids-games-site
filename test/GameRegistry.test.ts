import { describe, it, expect } from 'vitest';
import { GameRegistry } from '../src/core/GameRegistry';

describe('GameRegistry', () => {
  it('should maintain a singleton instance', () => {
    const registry1 = GameRegistry.getInstance();
    const registry2 = GameRegistry.getInstance();
    expect(registry1).toBe(registry2);
  });

  it('should have all games registered correctly', () => {
    const registry = GameRegistry.getInstance();
    const allGames = registry.getAll();

    expect(allGames.length).toBe(23);
  });

  it('should retrieve registered games by ID', () => {
    const registry = GameRegistry.getInstance();
    const balloonPop = registry.get('balloonPop');

    expect(balloonPop).toBeDefined();
    expect(balloonPop?.name).toBe('Tapa');
    expect(balloonPop?.portal).toBe('workshop');
  });

  it('should return undefined for unregistered game IDs', () => {
    const registry = GameRegistry.getInstance();
    expect(registry.get('nonExistentGame')).toBeUndefined();
  });
});
