import test from 'node:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { rm, cp, mkdtemp, chmod, readFile } from 'node:fs/promises';

import collectOutput from './collectOutput.js';

const verifyMonitor = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'docker-monitor-test-'));
  const executable = join(directory, 'docker');
  const callsPath = join(directory, 'calls');

  await cp(new URL('./fixtures/docker', import.meta.url), executable);
  await chmod(executable, 0o755);

  const child = spawn(process.execPath, ['dist/index.js'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_TEST_CONTEXT: '',
      TELEGRAM_BOT_TOKEN: '',
      TELEGRAM_ACCESS_PASSWORD: '',
      PATH: `${directory}:${process.env.PATH}`,
      POLL_INTERVAL_MS: '250',
      CONTAINER_NAME: 'service',
      CONTAINER_EXCLUDE_NAMES: 'mongo,rabbitmq',
      MOCK_DOCKER_CALLS: callsPath,
    },
  });

  const closed = once(child, 'close');
  const diagnostics = collectOutput(child.stderr);
  const lines = createInterface({ input: child.stdout });
  const entries = [];

  try {
    for await (const line of lines) {
      const entry = JSON.parse(line);

      entries.push(entry);

      if (entry.message === 'resumed') {
        child.kill('SIGTERM');
      }
    }

    const [code] = await closed;
    const stderr = await diagnostics;
    const calls = await readFile(callsPath, 'utf8');
    const names = new Set();

    for (const entry of entries) {
      names.add(entry.containerName);

      assert.equal(entry.stream, 'stdout');
      assert.match(entry.timestamp, /^2026-01-01T/);
    }

    assert.equal(code, 0);
    assert.deepEqual(names, new Set(['worker', 'api']));
    assert.equal(entries.length, 3);
    assert.equal(stderr.match(/"message":"warning"/g)?.length, 1);
    assert.match(stderr, /"stream":"stderr","message":"warning"/);
    assert.match(stderr, /Monitor stopped/);
    assert.match(calls, /--filter name=service/);
    assert.match(calls, /--tail 5 worker-id/);
    assert.equal(calls.includes('--tail 5 monitor-id'), false);
    assert.equal(calls.includes('--tail 5 mongo-id'), false);
    assert.equal(calls.includes('--tail 5 rabbitmq-id'), false);
    assert.match(calls, /--since 2026-01-01T00:00:01.000000000Z worker-id/);
  } finally {
    child.kill('SIGTERM');

    await closed;
    await diagnostics;
    await rm(directory, { recursive: true, force: true });
  }
};

test('streams multiple containers, reconnects with a cursor, and shuts down cleanly', { timeout: 10000 }, verifyMonitor);
