import { runTUI } from '../tui/index.js';

export interface ViewOpts {
  theme?: string;
}

export async function runView(opts: ViewOpts): Promise<number> {
  return runTUI({ theme: opts.theme });
}
