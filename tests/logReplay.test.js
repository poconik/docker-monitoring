import test from 'node:test';
import { Readable } from 'node:stream';
import assert from 'node:assert/strict';

import readOutput from '../dist/docker/readOutput.js';

const verifyLogReplay = async () => {
  const entries = [];
  const sink = entries.push.bind(entries);
  const container = { id: 'worker-id', name: 'worker' };

  const watcher = {
    controller: new AbortController(),
    task: Promise.resolve(),
    active: true,
    cursors: {
      stdout: { timestamp: undefined, entries: new Map() },
      stderr: { timestamp: undefined, entries: new Map() },
    },
  };

  const firstStdout = Readable.from([
    '2026-01-01T00:00:02.000000000Z repeated\n',
    '2026-01-01T00:00:02.000000000Z repeated\n',
  ]);

  await readOutput(firstStdout, 'stdout', container, watcher, sink);

  const firstStderr = Readable.from(['2026-01-01T00:00:01.000000000Z warning\n']);

  await readOutput(firstStderr, 'stderr', container, watcher, sink);

  assert.equal(entries.length, 3);

  const replayedStdout = Readable.from([
    '2026-01-01T00:00:01.000000000Z older replay\n',
    '2026-01-01T00:00:02.000000000Z repeated\n',
    '2026-01-01T00:00:02.000000000Z repeated\n',
    '2026-01-01T00:00:02.000000000Z repeated\n',
    '2026-01-01T00:00:02.000000000Z distinct entry\n',
    '2026-01-01T00:00:03.000000000Z repeated\n',
  ]);

  await readOutput(replayedStdout, 'stdout', container, watcher, sink);

  const replayedStderr = Readable.from([
    '2026-01-01T00:00:01.000000000Z warning\n',
    '2026-01-01T00:00:01.000000000Z new stderr at the same time\n',
    '2026-01-01T00:00:02.000000000Z next stderr\n',
  ]);

  await readOutput(replayedStderr, 'stderr', container, watcher, sink);

  const messages = [];

  for (const entry of entries) {
    messages.push(entry.message);
  }

  assert.deepEqual(messages, [
    'repeated',
    'repeated',
    'warning',
    'repeated',
    'distinct entry',
    'repeated',
    'new stderr at the same time',
    'next stderr',
  ]);

  const nextReplay = Readable.from([
    '2026-01-01T00:00:02.000000000Z repeated\n',
    '2026-01-01T00:00:03.000000000Z repeated\n',
    '2026-01-01T00:00:04.000000000Z newest\n',
  ]);

  await readOutput(nextReplay, 'stdout', container, watcher, sink);

  assert.equal(entries.length, 9);
  assert.equal(entries.at(-1).message, 'newest');
  assert.equal(watcher.cursors.stdout.entries.size, 1);
};

test('skips reconnect replays while preserving new identical logs and independent streams', verifyLogReplay);
