import { describe, expect, it } from 'vitest';
import { groupByProject, parseHostPorts, parsePsOutput, projectFromLabels } from './docker.js';

describe('parseHostPorts', () => {
  it('returns "-" for empty', () => {
    expect(parseHostPorts('')).toBe('-');
  });
  it('extracts unique host ports sorted numerically', () => {
    const s = '0.0.0.0:8080->80/tcp, 0.0.0.0:443->443/tcp, 0.0.0.0:80->80/tcp';
    expect(parseHostPorts(s)).toBe('80, 443, 8080');
  });
  it('returns "-" when no host publish', () => {
    expect(parseHostPorts('80/tcp')).toBe('-');
  });
  it('dedupes duplicates', () => {
    const s = '0.0.0.0:3000->3000/tcp, 0.0.0.0:3000->3000/tcp';
    expect(parseHostPorts(s)).toBe('3000');
  });
});

describe('projectFromLabels', () => {
  it('returns (standalone) for empty', () => {
    expect(projectFromLabels('')).toBe('(standalone)');
  });
  it('extracts compose project label', () => {
    const s = 'com.docker.compose.project=myapp,com.docker.compose.service=web';
    expect(projectFromLabels(s)).toBe('myapp');
  });
  it('handles label anywhere in the list', () => {
    const s = 'foo=bar,com.docker.compose.project=alpha,baz=qux';
    expect(projectFromLabels(s)).toBe('alpha');
  });
  it('returns (standalone) when compose label absent', () => {
    expect(projectFromLabels('foo=bar')).toBe('(standalone)');
  });
});

describe('parsePsOutput', () => {
  it('parses a single line', () => {
    const line = JSON.stringify({
      ID: 'abc',
      Names: 'web',
      Image: 'nginx',
      Status: 'Up 2 hours',
      Ports: '0.0.0.0:80->80/tcp',
      Labels: 'com.docker.compose.project=demo',
    });
    const out = parsePsOutput(line);
    expect(out).toHaveLength(1);
    expect(out[0]!.name).toBe('web');
    expect(out[0]!.project).toBe('demo');
  });
  it('skips blank + invalid JSON lines', () => {
    const good = JSON.stringify({ ID: '1', Names: 'a', Labels: '' });
    const raw = `${good}\n\nnot json\n${good}`;
    expect(parsePsOutput(raw)).toHaveLength(2);
  });
});

describe('groupByProject', () => {
  it('groups + sorts by project name', () => {
    const containers = parsePsOutput(
      [
        JSON.stringify({ Names: 'z1', Labels: 'com.docker.compose.project=zeta' }),
        JSON.stringify({ Names: 'a1', Labels: 'com.docker.compose.project=alpha' }),
        JSON.stringify({ Names: 'a2', Labels: 'com.docker.compose.project=alpha' }),
        JSON.stringify({ Names: 's1', Labels: '' }),
      ].join('\n'),
    );
    const groups = groupByProject(containers);
    expect(groups.map((g) => g.project)).toEqual(['(standalone)', 'alpha', 'zeta']);
    expect(groups[1]!.containers.map((c) => c.name)).toEqual(['a1', 'a2']);
  });
});
