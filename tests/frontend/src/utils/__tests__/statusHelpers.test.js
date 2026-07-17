import { describe, it, expect } from 'vitest';
import { getStatusColor, getStatusLabel } from '../../utils/statusHelpers';

describe('getStatusColor', () => {
  it('returns defaults for falsy values', () => {
    expect(getStatusColor()).toBe('bg-gray-100 text-gray-800');
  });

  it.each([
    ['YET_TO_BE_VERIFIED', 'bg-yellow-100 text-yellow-800'],
    ['LIVE', 'bg-green-100 text-green-800'],
    ['UPCOMING', 'bg-blue-100 text-blue-800'],
    ['ENDED', 'bg-gray-100 text-gray-800'],
    ['CANCELLED', 'bg-red-100 text-red-800'],
    ['REMOVED', 'bg-red-100 text-red-800'],
  ])('maps %s to %s', (status, color) => {
    expect(getStatusColor(status)).toBe(color);
  });

  it('falls back to neutral colors for unknown strings', () => {
    expect(getStatusColor('mystery')).toBe('bg-gray-100 text-gray-800');
  });
});

describe('getStatusLabel', () => {
  it('returns N/A for falsy statuses', () => {
    expect(getStatusLabel()).toBe('N/A');
  });

  it('returns friendly labels for known statuses', () => {
    expect(getStatusLabel('YET_TO_BE_VERIFIED')).toBe('Yet to be Verified');
    expect(getStatusLabel('REMOVED')).toBe('Removed');
  });

  it('passes through unknown statuses', () => {
    expect(getStatusLabel('LIVE')).toBe('LIVE');
  });
});
