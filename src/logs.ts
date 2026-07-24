import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import readline from 'node:readline';
import { formatJsonLogLine } from './format.js';

const MAX_LINES = 5000;
const TAIL = 200;

const GRAY = '\x1b[90m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

/**
 * Spawns `docker logs -f --tail N <name>` and feeds each stdout/stderr line
 * through `formatJsonLogLine` into a bounded ring buffer. Callback fires on
 * every update so the UI can re-render.
 */
export class LogStream {
  private child: ChildProcessWithoutNullStreams | null = null;
  private buffer: string[] = [];

  constructor(
    readonly name: string,
    private readonly onUpdate: () => void,
  ) {}

  start(): void {
    const child = spawn('docker', ['logs', '-f', '--tail', String(TAIL), this.name]);
    this.child = child;

    const push = (line: string) => {
      const formatted = formatJsonLogLine(line);
      if (formatted === '') return;
      this.buffer.push(formatted);
      if (this.buffer.length > MAX_LINES) {
        this.buffer.splice(0, this.buffer.length - MAX_LINES);
      }
      this.onUpdate();
    };

    readline.createInterface({ input: child.stdout, crlfDelay: Infinity }).on('line', push);
    readline.createInterface({ input: child.stderr, crlfDelay: Infinity }).on('line', push);

    child.on('error', (e) => {
      this.buffer.push(`${RED}--- spawn error: ${e.message} ---${RESET}`);
      this.onUpdate();
    });
    child.on('exit', () => {
      this.buffer.push(`${GRAY}--- log stream ended ---${RESET}`);
      this.child = null;
      this.onUpdate();
    });
  }

  stop(): void {
    if (this.child) {
      try {
        this.child.kill('SIGTERM');
      } catch {
        // ignore
      }
      this.child = null;
    }
  }

  lines(): readonly string[] {
    return this.buffer;
  }
}
