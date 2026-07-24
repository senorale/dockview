import React from 'react';
import { Box, Text, useStdout } from 'ink';
import type { Container } from '../docker.js';
import { useTheme } from '../theme.js';
import { statusColor, statusRole } from './themeUtil.js';

interface Props {
  rows: Container[];
  cursor: number;
}

const FIXED = { project: 24, status: 22, port: 12 };
const MIN_PROJECT = 12;
const MIN_NAME = 12;

interface ColWidths {
  project: number;
  name: number;
  status: number;
  port: number;
}

function computeCols(termCols: number): ColWidths {
  const usable = Math.max(0, termCols - 1);
  const fullTotal = FIXED.project + FIXED.status + FIXED.port + MIN_NAME;
  if (usable >= fullTotal) {
    return {
      project: FIXED.project,
      status: FIXED.status,
      port: FIXED.port,
      name: usable - FIXED.project - FIXED.status - FIXED.port,
    };
  }
  const noPortTotal = FIXED.project + FIXED.status + MIN_NAME;
  if (usable >= noPortTotal) {
    return {
      project: FIXED.project,
      status: FIXED.status,
      port: 0,
      name: usable - FIXED.project - FIXED.status,
    };
  }
  const project = Math.max(MIN_PROJECT, usable - FIXED.status - MIN_NAME);
  return {
    project,
    status: FIXED.status,
    port: 0,
    name: Math.max(MIN_NAME, usable - project - FIXED.status),
  };
}

function pad(s: string, n: number): string {
  if (n <= 0) return '';
  if (s.length >= n) return s.slice(0, n - 1) + '…';
  return s.padEnd(n);
}

function parseHostPortsStr(portsStr: string): string {
  if (!portsStr) return '-';
  const matches = [...portsStr.matchAll(/0\.0\.0\.0:(\d+)->/g)].map((m) => m[1]!);
  if (matches.length === 0) return '-';
  return [...new Set(matches)].sort((a, b) => Number(a) - Number(b)).join(', ');
}

export function ContainerTable({ rows, cursor }: Props): React.ReactElement {
  const theme = useTheme();
  const { stdout } = useStdout();
  const cols = computeCols(stdout?.columns ?? 200);

  // Compute displayed project column — hide repeated project name so rows in
  // the same compose project visually group. Show only on first row per group.
  const displayProject: string[] = rows.map((r, i) => (i > 0 && rows[i - 1]!.project === r.project ? '' : r.project));

  return (
    <Box flexDirection="column">
      <Text bold={theme.useBold} underline={theme.useUnderline}>
        {pad('Project', cols.project)}
        {pad('Container', cols.name)}
        {pad('Status', cols.status)}
        {cols.port > 0 ? pad('Port', cols.port) : ''}
      </Text>
      {rows.length === 0 && (
        <Box paddingY={1}>
          <Text dimColor={theme.useDim}>(no containers — is docker running?)</Text>
        </Box>
      )}
      {rows.map((r, i) => {
        const selected = i === cursor;
        const bg = selected ? theme.selectedBg : undefined;
        const role = statusRole(r.status);
        const statusFg = statusColor(role, theme);
        const port = parseHostPortsStr(r.ports);
        const proj = displayProject[i]!;
        return (
          <Text key={`${r.id}-${i}`} backgroundColor={bg}>
            <Text bold={proj !== '' && theme.useBold} color={proj !== '' ? theme.project : undefined}>
              {pad(proj, cols.project)}
            </Text>
            {pad(r.name, cols.name)}
            <Text color={statusFg}>{pad(r.status, cols.status)}</Text>
            {cols.port > 0 ? pad(port, cols.port) : ''}
          </Text>
        );
      })}
    </Box>
  );
}
