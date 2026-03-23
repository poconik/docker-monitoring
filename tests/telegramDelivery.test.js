import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';

import enqueueLog from '../dist/telegram/enqueueLog.js';
import telegramFetch from './fixtures/telegramFetch.js';
import deliverLogs from '../dist/telegram/deliverLogs.js';
import telegramFixture from './fixtures/telegramFixture.js';
import createTelegramState from '../dist/telegram/createTelegramState.js';

const verifyDelivery = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'telegram-delivery-test-'));
  const controller = new AbortController();
  let task;

  mock.method(globalThis, 'fetch', telegramFetch);

  try {
    const state = await createTelegramState({
      botToken: '123456:test_token',
      accessPassword: 'test-access-password',
      usersFile: join(directory, 'users.json'),
    }, controller.signal);

    state.users.chatIds.add(1001);
    state.users.chatIds.add(1002);

    enqueueLog(state, {
      timestamp: '2026-01-01T00:00:00.000000000Z',
      containerId: 'worker-id',
      containerName: 'worker',
      stream: 'stdout',
      message: '{"message":"test-access-password","count":2}',
    });

    const start = telegramFixture.requests.length;

    task = deliverLogs(state, controller.signal);

    const deadline = Date.now() + 5000;

    while (telegramFixture.requests.length < start + 2 && Date.now() < deadline) {
      await setTimeout(20);
    }

    const delivered = telegramFixture.requests.slice(start);
    const ids = new Set();

    assert.equal(delivered.length, 2);

    for (const request of delivered) {
      ids.add(request.payload.chat_id);

      assert.equal(request.method, 'sendMessage');
      assert.equal(request.payload.parse_mode, 'HTML');
      assert.match(request.payload.text, /<pre>\{\n/);
      assert.equal(request.payload.text.includes('test-access-password'), false);
      assert.match(request.payload.text, /\[REDACTED\]/);
    }

    assert.deepEqual(ids, new Set([1001, 1002]));

    state.users.chatIds.delete(1002);

    enqueueLog(state, {
      timestamp: '2026-01-01T00:00:01.000000000Z',
      containerId: 'worker-id',
      containerName: 'worker',
      stream: 'stdout',
      message: 'Next log',
    });

    const nextDeadline = Date.now() + 5000;

    while (telegramFixture.requests.length < start + 3 && Date.now() < nextDeadline) {
      await setTimeout(20);
    }

    assert.equal(telegramFixture.requests.length, start + 3);
    assert.equal(telegramFixture.requests.at(-1).payload.chat_id, 1001);
  } finally {
    controller.abort();

    await task;

    mock.restoreAll();

    await rm(directory, { recursive: true, force: true });
  }
};

test('broadcasts code blocks to subscribers and stops delivery after unsubscribe', { timeout: 12000 }, verifyDelivery);
