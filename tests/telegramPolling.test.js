import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';

import loadUsers from '../dist/telegram/loadUsers.js';
import telegramFetch from './fixtures/telegramFetch.js';
import pollUpdates from '../dist/telegram/pollUpdates.js';
import telegramFixture from './fixtures/telegramFixture.js';
import createTelegramState from '../dist/telegram/createTelegramState.js';

const verifyPolling = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'telegram-polling-test-'));
  const controller = new AbortController();
  const usersFile = join(directory, 'users.json');
  let task;

  mock.method(globalThis, 'fetch', telegramFetch);

  try {
    const state = await createTelegramState({
      botToken: '123456:test_token',
      accessPassword: 'test-access-password',
      usersFile,
    }, controller.signal);

    telegramFixture.updates.push({
      update_id: 10,
      message: {
        date: 1767225600,
        text: '/start test-access-password',
        chat: { id: 1001, type: 'private' },
        from: { id: 1001, is_bot: false },
      },
    });

    telegramFixture.failures.push({ method: 'sendMessage', ok: false, error_code: 403 });

    task = pollUpdates(state, controller.signal);

    const deadline = Date.now() + 5000;

    while (Date.now() < deadline) {
      const stored = await loadUsers(usersFile);

      if (stored.updateOffset === 11) {
        break;
      }

      await setTimeout(20);
    }

    const stored = await loadUsers(usersFile);

    assert.deepEqual([...stored.chatIds], [1001]);
    assert.equal(stored.updateOffset, 11);
  } finally {
    controller.abort();

    await task;

    mock.restoreAll();

    await rm(directory, { recursive: true, force: true });
  }
};

test('long polling persists membership and the acknowledged update offset', { timeout: 10000 }, verifyPolling);
