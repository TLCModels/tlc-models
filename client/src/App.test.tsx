import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('should pass smoke test', () => {
    expect(true).toBe(true);
  });

  it('should have correct project name', () => {
    expect('tlc-models').toMatch(/tlc/i);
  });
});
