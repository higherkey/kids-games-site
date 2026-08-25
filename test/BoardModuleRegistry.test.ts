import { describe, it, expect } from 'vitest';
import { BoardModuleRegistry } from '../src/games/busyBoard/BoardModuleRegistry';

describe('BoardModuleRegistry', () => {
  it('should have all expected modules registered for Boards 1 to 5', () => {
    // Board 1 IDs
    const board1Ids = ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010'];
    board1Ids.forEach(id => {
      expect(BoardModuleRegistry[id], `Missing Board 1 module ${id}`).toBeDefined();
    });

    // Board 2 IDs
    const board2Ids = ['011', '012', '013', '015', '016', '017', '018', '019', '020'];
    board2Ids.forEach(id => {
      expect(BoardModuleRegistry[id], `Missing Board 2 module ${id}`).toBeDefined();
    });

    // Board 3 IDs
    const board3Ids = ['021', '022', '023', '024', '025', '026', '027', '028', '029', '030'];
    board3Ids.forEach(id => {
      expect(BoardModuleRegistry[id], `Missing Board 3 module ${id}`).toBeDefined();
    });

    // Board 4 IDs (Sound & Wave Studio)
    const board4Ids = ['031', '033', '037', '038', '039', '040'];
    board4Ids.forEach(id => {
      expect(BoardModuleRegistry[id], `Missing Board 4 module ${id}`).toBeDefined();
    });

    // Board 5 IDs (Typography Board)
    const board5Ids = ['041', '043', '044', '046', '047'];
    board5Ids.forEach(id => {
      expect(BoardModuleRegistry[id], `Missing Board 5 module ${id}`).toBeDefined();
    });
  });

  it('should instantiate each registered module cleanly', () => {
    const mockGame = {
      getTheme: () => 'paper',
      updateRGB: () => {},
      getRGB: () => ({ r: 128, g: 128, b: 128 }),
      triggerShake: () => {},
    };

    Object.entries(BoardModuleRegistry).forEach(([id, Constructor]) => {
      expect(typeof Constructor).toBe('function');
      const instance = new Constructor(id, 0, 0, 1, 1, mockGame);
      expect(instance).toBeDefined();
      expect(instance.id).toBe(id);
      if (instance.init) {
        instance.init();
      }
    });
  });
});
