#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('dockview')
  .description('Terminal UI for Docker containers with vim motions')
  .version('0.2.0-dev');

program
  .command('view', { isDefault: true })
  .description('launch the live TUI (default)')
  .option('--theme <name>', 'theme: default | mono (or a name from ~/.config/dockview/theme.json)')
  .action(async (opts) => {
    const { runView } = await import('./commands/view.js');
    process.exit(await runView({ theme: opts.theme }));
  });

program
  .command('fmt')
  .description('read JSON log lines from stdin, print colored one-liners')
  .action(async () => {
    const { runFmt } = await import('./commands/fmt.js');
    process.exit(await runFmt());
  });

program.parseAsync(process.argv);
