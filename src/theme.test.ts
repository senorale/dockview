import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_THEME, MONO_THEME, resolveTheme } from './theme.js';

describe('resolveTheme', () => {
  const origXDG = process.env.XDG_CONFIG_HOME;
  const origEnv = process.env.DOCKVIEW_THEME;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dockview-theme-'));
    process.env.XDG_CONFIG_HOME = tmpDir;
    delete process.env.DOCKVIEW_THEME;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (origXDG === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = origXDG;
    if (origEnv === undefined) delete process.env.DOCKVIEW_THEME;
    else process.env.DOCKVIEW_THEME = origEnv;
  });

  it('returns default when nothing configured', () => {
    expect(resolveTheme()).toEqual(DEFAULT_THEME);
  });

  it('honors --theme override for built-ins', () => {
    expect(resolveTheme('mono')).toEqual(MONO_THEME);
  });

  it('honors $DOCKVIEW_THEME', () => {
    process.env.DOCKVIEW_THEME = 'mono';
    expect(resolveTheme()).toEqual(MONO_THEME);
  });

  it('reads ~/.config/dockview/theme.json with extends', () => {
    const cfgDir = path.join(tmpDir, 'dockview');
    fs.mkdirSync(cfgDir);
    fs.writeFileSync(
      path.join(cfgDir, 'theme.json'),
      JSON.stringify({ extends: 'mono', running: 'green', name: 'custom' }),
    );
    const t = resolveTheme();
    expect(t.name).toBe('custom');
    expect(t.running).toBe('green');
    expect(t.selectedBg).toBe(MONO_THEME.selectedBg);
  });

  it('falls back to default on malformed theme.json', () => {
    const cfgDir = path.join(tmpDir, 'dockview');
    fs.mkdirSync(cfgDir);
    fs.writeFileSync(path.join(cfgDir, 'theme.json'), '{ not valid json');
    expect(resolveTheme()).toEqual(DEFAULT_THEME);
  });
});
