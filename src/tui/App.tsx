import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { dockerAction, groupByProject, listContainers, type Container } from '../docker.js';
import { LogStream } from '../logs.js';
import { useTheme } from '../theme.js';
import { ContainerTable } from './ContainerTable.js';
import { PreviewPane } from './PreviewPane.js';
import { StatusBar } from './StatusBar.js';

const REFRESH_MS = 5000;

type Mode = 'table' | 'preview';

interface Notice {
  msg: string;
  kind: 'info' | 'warn' | 'error';
}

export function App(): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [containers, setContainers] = useState<Container[]>([]);
  const [cursor, setCursor] = useState(0);
  const [showAll, setShowAll] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [mode, setMode] = useState<Mode>('table');
  const [previewName, setPreviewName] = useState<string>('');
  const [previewLines, setPreviewLines] = useState<readonly string[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [atBottom, setAtBottom] = useState(true);

  const lastKey = useRef<string>('');
  const noticeTimer = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<LogStream | null>(null);
  const cursorRef = useRef(cursor);
  const containersRef = useRef(containers);
  const showAllRef = useRef(showAll);
  const modeRef = useRef<Mode>(mode);
  const atBottomRef = useRef(atBottom);

  cursorRef.current = cursor;
  containersRef.current = containers;
  showAllRef.current = showAll;
  modeRef.current = mode;
  atBottomRef.current = atBottom;

  const flash = useCallback((msg: string, kind: 'info' | 'warn' | 'error' = 'info') => {
    setNotice({ msg, kind });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3000);
  }, []);

  const load = useCallback(async () => {
    const raw = await listContainers();
    const grouped = groupByProject(raw);
    const flat: Container[] = [];
    for (const g of grouped) for (const c of g.containers) flat.push(c);
    setContainers((prev) => {
      const prevName = prev[cursorRef.current]?.name;
      const nextIdx = prevName ? flat.findIndex((c) => c.name === prevName) : -1;
      if (nextIdx >= 0) setCursor(nextIdx);
      else if (cursorRef.current >= flat.length) setCursor(Math.max(0, flat.length - 1));
      return flat;
    });
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      clearInterval(timer);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      streamRef.current?.stop();
    };
  }, [load]);

  const visible = showAll
    ? containers
    : containers.filter((c) => c.status.includes('Up'));

  const runContainerAction = useCallback(
    async (action: 'start' | 'stop' | 'restart', verb: string) => {
      const row = visible[cursorRef.current];
      if (!row) {
        flash('no container selected', 'warn');
        return;
      }
      flash(`${verb} ${row.name}…`);
      const result = await dockerAction(action, row.name);
      if (result.ok) {
        flash(`${row.name} ${verb.replace(/ing$/, 'ed')}`);
        load();
      } else {
        flash(`docker ${action} failed: ${result.error ?? '?'}`, 'error');
      }
    },
    [flash, load, visible],
  );

  const runProjectAction = useCallback(
    async (action: 'start' | 'stop' | 'restart', verb: string) => {
      const row = visible[cursorRef.current];
      if (!row) {
        flash('no container selected', 'warn');
        return;
      }
      const targets = containersRef.current
        .filter((c) => c.project === row.project)
        .map((c) => c.name);
      flash(`${verb} ${targets.length} in ${row.project}…`);
      const results = await Promise.all(targets.map((n) => dockerAction(action, n)));
      const failed = results.filter((r) => !r.ok).length;
      if (failed === 0) {
        flash(`${row.project} ${verb.replace(/ing$/, 'ed')} (${targets.length})`);
      } else {
        flash(`${row.project}: ${targets.length - failed} ok, ${failed} failed`, 'error');
      }
      load();
    },
    [flash, load, visible],
  );

  const openLogs = useCallback(() => {
    const row = visible[cursorRef.current];
    if (!row) {
      flash('no container selected', 'warn');
      return;
    }
    streamRef.current?.stop();
    const s = new LogStream(row.name, () => {
      if (streamRef.current !== s) return;
      const next = [...s.lines()];
      setPreviewLines(next);
      if (atBottomRef.current) setScrollOffset(0);
    });
    streamRef.current = s;
    setPreviewName(row.name);
    setPreviewLines([]);
    setScrollOffset(0);
    setAtBottom(true);
    setMode('preview');
    s.start();
  }, [flash, visible]);

  const closePreview = useCallback(() => {
    streamRef.current?.stop();
    streamRef.current = null;
    setMode('table');
    setPreviewLines([]);
    setPreviewName('');
  }, []);

  const termRows = stdout?.rows ?? 40;
  const previewHeight = Math.max(5, termRows - 8);

  useInput(
    (input, key) => {
      if (key.ctrl && input === 'q') return exit();
      if (input === 'q') {
        streamRef.current?.stop();
        return exit();
      }

      if (mode === 'preview') {
        if (key.escape) return closePreview();
        if (input === 'l' || key.return) return closePreview(); // toggle
        const total = previewLines.length;
        const maxScroll = Math.max(0, total - previewHeight);
        const pageStep = Math.max(1, Math.floor(previewHeight / 2));
        if (input === 'j' || key.downArrow) {
          setScrollOffset((s) => {
            const next = Math.max(0, s - 1);
            setAtBottom(next === 0);
            return next;
          });
          return;
        }
        if (input === 'k' || key.upArrow) {
          setScrollOffset((s) => {
            const next = Math.min(maxScroll, s + 1);
            setAtBottom(next === 0);
            return next;
          });
          return;
        }
        if (key.ctrl && input === 'd') {
          setScrollOffset((s) => {
            const next = Math.max(0, s - pageStep);
            setAtBottom(next === 0);
            return next;
          });
          return;
        }
        if (key.ctrl && input === 'u') {
          setScrollOffset((s) => {
            const next = Math.min(maxScroll, s + pageStep);
            setAtBottom(next === 0);
            return next;
          });
          return;
        }
        if (input === 'G') {
          setScrollOffset(0);
          setAtBottom(true);
          return;
        }
        if (input === 'g') {
          if (lastKey.current === 'g') {
            setScrollOffset(maxScroll);
            setAtBottom(maxScroll === 0);
            lastKey.current = '';
            return;
          }
          lastKey.current = 'g';
          return;
        }
        lastKey.current = input;
        return;
      }

      // Table mode
      if (input === 'j' || key.downArrow) {
        setCursor((c) => Math.min(visible.length - 1, c + 1));
        lastKey.current = 'j';
        return;
      }
      if (input === 'k' || key.upArrow) {
        setCursor((c) => Math.max(0, c - 1));
        lastKey.current = 'k';
        return;
      }
      if (input === 'G') {
        setCursor(Math.max(0, visible.length - 1));
        lastKey.current = 'G';
        return;
      }
      if (input === 'g') {
        if (lastKey.current === 'g') {
          setCursor(0);
          lastKey.current = '';
          return;
        }
        lastKey.current = 'g';
        return;
      }

      if (input === 'r') return void runContainerAction('restart', 'restarting');
      if (input === 's') return void runContainerAction('start', 'starting');
      if (input === 'c') return void runContainerAction('stop', 'stopping');
      if (input === 'R') return void runProjectAction('restart', 'restarting');
      if (input === 'S') return void runProjectAction('start', 'starting');
      if (input === 'C') return void runProjectAction('stop', 'stopping');
      if (input === 'l' || key.return) return openLogs();
      if (input === 'h') {
        setShowAll((v) => {
          const next = !v;
          flash(`showing: ${next ? 'all' : 'running only'}`);
          return next;
        });
        return;
      }
      lastKey.current = input;
    },
    { isActive: true },
  );

  const runningTotal = containers.filter((c) => c.status.includes('Up')).length;
  const theme = useTheme();
  const noticeColor =
    notice?.kind === 'error' ? theme.error : notice?.kind === 'warn' ? theme.warn : theme.info;

  useEffect(() => {
    if (cursor >= visible.length) setCursor(Math.max(0, visible.length - 1));
  }, [showAll, visible.length, cursor]);

  return (
    <Box flexDirection="column">
      <Box paddingX={1} borderStyle="single" borderColor={theme.primaryBorder}>
        <Text bold={theme.useBold} color={theme.primary}>DockView</Text>
      </Box>
      {mode === 'table' ? (
        <ContainerTable rows={visible} cursor={cursor} />
      ) : (
        <PreviewPane
          name={previewName}
          lines={previewLines}
          scrollOffset={scrollOffset}
          viewportHeight={previewHeight}
        />
      )}
      {notice && (
        <Box paddingX={1}>
          <Text color={noticeColor}>{notice.msg}</Text>
        </Box>
      )}
      <StatusBar
        running={runningTotal}
        total={containers.length}
        showAll={showAll}
        mode={mode}
      />
    </Box>
  );
}
