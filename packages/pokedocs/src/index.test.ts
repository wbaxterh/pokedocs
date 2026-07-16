import { describe, expect, it } from 'vitest';
import { COMMANDS } from './index.js';

describe('pokedocs CLI surface', () => {
  it('pins the PRD command set', () => {
    expect(COMMANDS).toEqual(['check', 'export', 'deploy', 'mcp']);
  });
});
