import { describe, expect, it, vi } from 'vitest';
import { checkSiteUrl, isPlaceholderUrl } from './url-guard.js';

describe('S1.7.3 — baseUrl footgun elimination', () => {
  it.each([
    'http://localhost',
    'http://localhost:3000',
    'https://127.0.0.1:8080',
    'http://0.0.0.0',
    'http://[::1]:3000',
    'https://docs.example.com',
    'https://example.com',
    'https://example.org',
  ])('flags %s as a placeholder url', (url) => {
    expect(isPlaceholderUrl(url)).toBe(true);
  });

  it.each([
    'https://wbaxterh.github.io',
    'https://docs.mycompany.dev',
    'https://localhost-tools.io', // "localhost" as a name fragment is fine
    'https://myexample.company.com',
  ])('accepts %s as a real url', (url) => {
    expect(isPlaceholderUrl(url)).toBe(false);
  });

  it('stays silent in development', () => {
    const logger = vi.fn();
    checkSiteUrl('http://localhost:3000', {
      isProduction: false,
      strict: false,
      logger,
    });
    expect(logger).not.toHaveBeenCalled();
  });

  it('warns prominently on a production build with a placeholder url', () => {
    const logger = vi.fn();
    checkSiteUrl('https://docs.example.com', {
      isProduction: true,
      strict: false,
      logger,
    });
    expect(logger).toHaveBeenCalledOnce();
    const message = logger.mock.calls[0][0] as string;
    expect(message).toContain('WARNING');
    expect(message).toContain('docs.example.com');
    expect(message).toContain('POKEDOCS_URL');
    expect(message).toContain('POKEDOCS_STRICT_URL');
  });

  it('fails the build in strict mode', () => {
    expect(() =>
      checkSiteUrl('http://localhost:3000', {
        isProduction: true,
        strict: true,
      }),
    ).toThrow(/POKEDOCS_STRICT_URL/);
  });

  it('never warns for a real production url', () => {
    const logger = vi.fn();
    checkSiteUrl('https://wbaxterh.github.io', {
      isProduction: true,
      strict: true,
      logger,
    });
    expect(logger).not.toHaveBeenCalled();
  });
});
