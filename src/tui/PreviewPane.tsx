import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme.js';

interface Props {
  name: string;
  lines: readonly string[];
  scrollOffset: number;
  viewportHeight: number;
}

export function PreviewPane({
  name,
  lines,
  scrollOffset,
  viewportHeight,
}: Props): React.ReactElement {
  const theme = useTheme();
  const visibleH = Math.max(1, viewportHeight);
  const end = Math.max(0, lines.length - scrollOffset);
  const start = Math.max(0, end - visibleH);
  const slice = lines.slice(start, end);
  const positionLabel =
    lines.length === 0
      ? ''
      : scrollOffset === 0
        ? `[bottom · ${lines.length} lines]`
        : `[+${scrollOffset} from bottom · ${lines.length} lines]`;

  return (
    <Box flexDirection="column">
      <Box paddingX={1}>
        <Text bold={theme.useBold} color={theme.primary}>logs: {name}</Text>
        <Text> </Text>
        <Text dimColor={theme.useDim}>{positionLabel}</Text>
      </Box>
      <Box flexDirection="column" paddingX={1}>
        {slice.length === 0 && <Text dimColor={theme.useDim}>(waiting for output…)</Text>}
        {slice.map((l, i) => (
          <Text key={start + i} wrap="truncate">
            {l}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
