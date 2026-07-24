import fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';

// Ink owns stdout; console.log from a component scrambles the UI. Use dbg()
// (file append) and `tail -f ~/.claude/dockview/debug.log` in another tab.
let debugPath: string | null = null;

function resolvePath(): string {
  if (debugPath) return debugPath;
  const dir = path.join(homedir(), '.claude', 'dockview');
  fs.mkdirSync(dir, { recursive: true });
  debugPath = path.join(dir, 'debug.log');
  return debugPath;
}

export function dbg(...parts: unknown[]): void {
  if (process.env.DOCKVIEW_DEBUG !== '1') return;
  const stamp = new Date().toISOString();
  const line =
    parts
      .map((p) => (typeof p === 'string' ? p : JSON.stringify(p)))
      .join(' ') + '\n';
  fs.appendFileSync(resolvePath(), `${stamp} ${line}`);
}
