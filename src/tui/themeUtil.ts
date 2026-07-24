import type { Color, Theme } from '../theme.js';

export type StatusRole = 'running' | 'exited' | 'other';

export function statusRole(status: string): StatusRole {
  if (status.includes('Up')) return 'running';
  if (status.includes('Exited')) return 'exited';
  return 'other';
}

export function statusColor(role: StatusRole, theme: Theme): Color {
  if (role === 'running') return theme.running;
  if (role === 'exited') return theme.exited;
  return theme.otherStatus;
}
