import { execa } from 'execa';

export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  ports: string;
  project: string;
}

export interface Group {
  project: string;
  containers: Container[];
}

interface DockerPsJson {
  ID?: string;
  Names?: string;
  Image?: string;
  Status?: string;
  Ports?: string;
  Labels?: string;
}

const COMPOSE_PROJECT_LABEL = 'com.docker.compose.project=';

export function parseHostPorts(portsStr: string): string {
  if (!portsStr) return '-';
  const matches = [...portsStr.matchAll(/0\.0\.0\.0:(\d+)->/g)].map((m) => m[1]!);
  if (matches.length === 0) return '-';
  const unique = [...new Set(matches)].sort((a, b) => Number(a) - Number(b));
  return unique.join(', ');
}

export function projectFromLabels(labels: string): string {
  if (!labels) return '(standalone)';
  for (const label of labels.split(',')) {
    if (label.startsWith(COMPOSE_PROJECT_LABEL)) {
      return label.slice(COMPOSE_PROJECT_LABEL.length);
    }
  }
  return '(standalone)';
}

export function parsePsOutput(stdout: string): Container[] {
  const out: Container[] = [];
  for (const line of stdout.trim().split('\n')) {
    if (!line) continue;
    let json: DockerPsJson;
    try {
      json = JSON.parse(line) as DockerPsJson;
    } catch {
      continue;
    }
    out.push({
      id: json.ID ?? '',
      name: json.Names ?? '',
      image: json.Image ?? '',
      status: json.Status ?? '',
      ports: json.Ports ?? '',
      project: projectFromLabels(json.Labels ?? ''),
    });
  }
  return out;
}

export function groupByProject(containers: Container[]): Group[] {
  const map = new Map<string, Container[]>();
  for (const c of containers) {
    const arr = map.get(c.project);
    if (arr) arr.push(c);
    else map.set(c.project, [c]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([project, containers]) => ({ project, containers }));
}

export async function listContainers(): Promise<Container[]> {
  try {
    const { stdout } = await execa('docker', ['ps', '-a', '--format', '{{json .}}']);
    return parsePsOutput(stdout);
  } catch {
    return [];
  }
}

export async function dockerAction(
  action: 'start' | 'stop' | 'restart',
  name: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await execa('docker', [action, name]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
