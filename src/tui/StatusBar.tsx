import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme.js';

interface Props {
  running: number;
  total: number;
  showAll: boolean;
  mode: 'table' | 'preview';
}

export function StatusBar({ running, total, showAll, mode }: Props): React.ReactElement {
  const theme = useTheme();
  const filter = showAll ? 'all' : 'running only';
  const hints =
    mode === 'preview'
      ? 'j/k · Ctrl-D/U · gg/G · l/Enter/Esc close · q quit'
      : 'j/k · gg/G · r/s/c container · R/S/C project · l/Enter logs · h filter · q quit';
  return (
    <Box paddingX={1}>
      <Text dimColor={theme.useDim}>
        {running}/{total} running | filter: {filter} | {hints}
      </Text>
    </Box>
  );
}
