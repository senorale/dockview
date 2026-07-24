const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';

const LEVEL_COLORS: Record<string, { color: string; label: string }> = {
  error: { color: RED, label: 'ERROR' },
  warn: { color: YELLOW, label: 'WARN ' },
  warning: { color: YELLOW, label: 'WARN ' },
  info: { color: GREEN, label: 'INFO ' },
  debug: { color: CYAN, label: 'DEBUG' },
};

interface LogEntry {
  level?: string;
  timestamp?: string;
  message?: string;
  path?: string;
  method?: string;
  status?: string | number;
  db?: string | number;
}

export function formatJsonLogLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return '';
  let entry: LogEntry;
  try {
    entry = JSON.parse(trimmed) as LogEntry;
  } catch {
    return trimmed;
  }
  const level = (entry.level ?? '').toLowerCase();
  const known = LEVEL_COLORS[level];
  const color = known?.color ?? CYAN;
  const label = known?.label ?? level.toUpperCase().padEnd(5);
  const timestamp = (entry.timestamp ?? '').slice(11, 19);
  const message = entry.message ?? '';

  let extra = '';
  if (entry.path) {
    const method = entry.method ?? '';
    const path = entry.path;
    const status = entry.status ?? '';
    const db = entry.db ?? '';
    extra = ` (${method} ${path} ${status} ${db}ms)`;
  }

  return `${color}${label}${RESET} ${GRAY}${timestamp}${RESET} ${message}${extra}`;
}
