import React from 'react';
import { render } from 'ink';
import { App } from './App.js';
import { ThemeContext, resolveTheme } from '../theme.js';

// Alt-screen escape codes — same as vim/less.
const ENTER_ALT = '\x1b[?1049h\x1b[H';
const LEAVE_ALT = '\x1b[?1049l';

export interface RunOpts {
  theme?: string;
}

export async function runTUI(opts: RunOpts = {}): Promise<number> {
  const theme = resolveTheme(opts.theme);

  let left = false;
  const leave = () => {
    if (left) return;
    left = true;
    process.stdout.write(LEAVE_ALT);
  };
  process.stdout.write(ENTER_ALT);
  process.on('exit', leave);
  process.on('SIGTERM', leave);

  // On resize, clear the alt-screen so Ink's next frame starts blank.
  const onResize = () => process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.on('resize', onResize);

  const tree = React.createElement(
    ThemeContext.Provider,
    { value: theme },
    React.createElement(App),
  );
  const instance = render(tree, { exitOnCtrlC: false });
  try {
    await instance.waitUntilExit();
  } finally {
    process.stdout.off('resize', onResize);
    leave();
  }
  return 0;
}
