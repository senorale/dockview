import fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { createContext, useContext } from 'react';

/** Ink accepts named colors or hex strings. `undefined` = terminal default. */
export type Color = string | undefined;

export interface Theme {
  name: string;
  // Chrome
  primary: Color;         // header text
  primaryBorder: Color;   // header border
  // Selection
  selectedBg: Color;      // background of highlighted row
  // Container status
  running: Color;
  exited: Color;
  otherStatus: Color;     // paused / restarting / created / dead
  // Header emphasis (project column)
  project: Color;
  // Notices
  info: Color;
  warn: Color;
  error: Color;
  // Emphasis toggles
  useBold: boolean;
  useUnderline: boolean;
  useDim: boolean;
}

export const DEFAULT_THEME: Theme = {
  name: 'default',
  primary: 'cyan',
  primaryBorder: 'cyan',
  selectedBg: 'blue',
  running: 'green',
  exited: 'red',
  otherStatus: 'yellow',
  project: 'cyan',
  info: 'green',
  warn: 'yellow',
  error: 'red',
  useBold: true,
  useUnderline: true,
  useDim: true,
};

export const MONO_THEME: Theme = {
  name: 'mono',
  primary: undefined,
  primaryBorder: 'white',
  selectedBg: 'gray',
  running: undefined,
  exited: undefined,
  otherStatus: undefined,
  project: undefined,
  info: undefined,
  warn: undefined,
  error: undefined,
  useBold: true,
  useUnderline: true,
  useDim: true,
};

const BUILT_IN: Record<string, Theme> = {
  default: DEFAULT_THEME,
  mono: MONO_THEME,
};

export function themeConfigPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.length > 0 ? xdg : path.join(homedir(), '.config');
  return path.join(base, 'dockview', 'theme.json');
}

/** Resolve active theme:
 *   1. explicit `override` (from --theme flag)
 *   2. $DOCKVIEW_THEME
 *   3. ~/.config/dockview/theme.json (custom object OR {"extends": "mono", ...})
 *   4. DEFAULT_THEME
 */
export function resolveTheme(override?: string): Theme {
  const named = override || process.env.DOCKVIEW_THEME;
  if (named && BUILT_IN[named]) return BUILT_IN[named];

  const cfgPath = themeConfigPath();
  if (fs.existsSync(cfgPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      const base = BUILT_IN[raw.extends] ?? DEFAULT_THEME;
      const { extends: _e, ...overrides } = raw;
      return { ...base, ...overrides, name: overrides.name ?? base.name };
    } catch {
      // fall through
    }
  }

  if (named && !BUILT_IN[named]) {
    return { ...DEFAULT_THEME, name: named };
  }
  return DEFAULT_THEME;
}

export const ThemeContext = createContext<Theme>(DEFAULT_THEME);
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export function listBuiltInThemes(): string[] {
  return Object.keys(BUILT_IN);
}
