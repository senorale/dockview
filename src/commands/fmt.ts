import readline from 'node:readline';
import { formatJsonLogLine } from '../format.js';

export async function runFmt(): Promise<number> {
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    const out = formatJsonLogLine(line);
    if (out !== '') process.stdout.write(`${out}\n`);
  }
  return 0;
}
