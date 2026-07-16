import { describe, expect, it } from 'vitest';
import { compileBranding } from './index.js';

describe('@pokedocs/theme skeleton', () => {
  it('fails loudly with a pointer to the implementing story', () => {
    expect(() => compileBranding({ brandColor: '#D8232A' })).toThrow(
      /S1\.4\.1/,
    );
  });
});
