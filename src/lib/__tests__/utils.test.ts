import { describe, it, expect } from 'vitest';
import { calculateDistance, cn } from '../utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges class names cleanly', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
      expect(cn('p-4', 'p-2')).toBe('p-2');
    });
  });

  describe('calculateDistance', () => {
    it('calculates 0 distance for identical coordinates', () => {
      const dist = calculateDistance(51.47, -0.4543, 51.47, -0.4543);
      expect(dist).toBeCloseTo(0, 4);
    });

    it('calculates accurate Nautical Miles distance between JFK and LHR', () => {
      // JFK: 40.6413, -73.7781
      // LHR: 51.4700, -0.4543
      const dist = calculateDistance(40.6413, -73.7781, 51.47, -0.4543);
      // Great Circle Distance JFK to LHR is ~3000 NM
      expect(dist).toBeGreaterThan(2900);
      expect(dist).toBeLessThan(3100);
    });
  });
});
