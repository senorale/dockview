import { describe, expect, it } from 'vitest';
import { formatJsonLogLine } from './format.js';

describe('formatJsonLogLine', () => {
  it('returns "" for blank input', () => {
    expect(formatJsonLogLine('')).toBe('');
    expect(formatJsonLogLine('   ')).toBe('');
  });

  it('passes non-JSON through untouched', () => {
    expect(formatJsonLogLine('plain text log')).toBe('plain text log');
  });

  it('renders an info log with timestamp + message', () => {
    const line = JSON.stringify({
      level: 'info',
      timestamp: '2026-07-24T14:30:15.123Z',
      message: 'ready',
    });
    const out = formatJsonLogLine(line);
    expect(out).toContain('INFO ');
    expect(out).toContain('14:30:15');
    expect(out).toContain('ready');
  });

  it('renders error label for level=error', () => {
    const line = JSON.stringify({ level: 'error', message: 'boom' });
    expect(formatJsonLogLine(line)).toContain('ERROR');
  });

  it('includes request suffix when path present', () => {
    const line = JSON.stringify({
      level: 'info',
      timestamp: '2026-07-24T14:00:00Z',
      message: 'GET',
      method: 'GET',
      path: '/health',
      status: 200,
      db: 3,
    });
    expect(formatJsonLogLine(line)).toContain('(GET /health 200 3ms)');
  });

  it('handles unknown level with padded label', () => {
    const line = JSON.stringify({ level: 'trace', message: 'hi' });
    expect(formatJsonLogLine(line)).toContain('TRACE');
  });
});
