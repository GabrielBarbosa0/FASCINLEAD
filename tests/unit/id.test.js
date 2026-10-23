import { afterEach, describe, expect, it, vi } from 'vitest';
import { createId } from '../../src/utils/id.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createId', () => {
  it('uses randomUUID when the browser provides it', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'native-id' });
    expect(createId()).toBe('native-id');
  });

  it('creates a UUID when randomUUID is unavailable in an insecure context', () => {
    vi.stubGlobal('crypto', {
      getRandomValues(bytes) {
        bytes.forEach((_, index) => { bytes[index] = index; });
        return bytes;
      }
    });

    expect(createId()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
  });
});
