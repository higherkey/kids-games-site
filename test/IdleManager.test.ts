import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IdleManager } from '../src/core/IdleManager';

describe('IdleManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should trigger callback after specified idle timeout', () => {
    const onIdle = vi.fn();
    const manager = new IdleManager(1000, onIdle);

    manager.start();
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1100);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('should reset timer when user interaction occurs', () => {
    const onIdle = vi.fn();
    const manager = new IdleManager(1000, onIdle);

    vi.advanceTimersByTime(500);

    // Simulate user interaction mousedown event on document
    document.dispatchEvent(new Event('mousedown'));
    vi.advanceTimersByTime(600);

    expect(onIdle).not.toHaveBeenCalled();

    // Advance past remaining timeout from reset (500ms remaining)
    vi.advanceTimersByTime(500);
    expect(onIdle).toHaveBeenCalledTimes(1);

    manager.stop();
  });

  it('should stop timer cleanly when stop is called', () => {
    const onIdle = vi.fn();
    const manager = new IdleManager(1000, onIdle);

    manager.start();
    manager.stop();

    vi.advanceTimersByTime(2000);
    expect(onIdle).not.toHaveBeenCalled();
  });
});
