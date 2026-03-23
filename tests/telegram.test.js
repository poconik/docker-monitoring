import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { rm, mkdtemp, writeFile, stat } from 'node:fs/promises';

import loadUsers from '../dist/telegram/loadUsers.js';
import telegramFetch from './fixtures/telegramFetch.js';
import sendMessage from '../dist/telegram/sendMessage.js';
import handleUpdate from '../dist/telegram/handleUpdate.js';
import telegramFixture from './fixtures/telegramFixture.js';
import requestTelegram from '../dist/telegram/requestTelegram.js';
import createTelegramState from '../dist/telegram/createTelegramState.js';

const verifyTelegram = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'telegram-monitor-test-'));
  const controller = new AbortController();

  const config = {
    botToken: '123456:test_token',
    accessPassword: 'test-access-password',
    usersFile: join(directory, 'users.json'),
  };

  const update = {
    update_id: 1,
    message: {
      date: 1767225600,
      text: 'wrong-password',
      chat: { id: 1001, type: 'private' },
      from: { id: 1001, is_bot: false },
    },
  };

  mock.method(globalThis, 'fetch', telegramFetch);

  try {
    const state = await createTelegramState(config, controller.signal);

    await handleUpdate(state, update, controller.signal);

    assert.equal(state.users.chatIds.size, 0);

    update.message.text = config.accessPassword;

    await handleUpdate(state, update, controller.signal);
    await handleUpdate(state, update, controller.signal);

    const loaded = await loadUsers(config.usersFile);
    const permissions = await stat(config.usersFile);

    assert.deepEqual([...loaded.chatIds], [1001]);
    assert.equal(permissions.mode & 0o777, 0o600);

    update.message.chat = { id: -1002, type: 'group' };

    await handleUpdate(state, update, controller.signal);

    assert.deepEqual([...state.users.chatIds], [1001]);

    const outgoing = JSON.stringify(telegramFixture.requests);

    assert.equal(outgoing.includes(config.accessPassword), false);
    assert.equal(outgoing.includes(config.botToken), false);

    update.message.chat = { id: 1001, type: 'private' };
    update.message.text = '/stop';

    await handleUpdate(state, update, controller.signal);

    const unsubscribed = await loadUsers(config.usersFile);

    assert.equal(unsubscribed.chatIds.size, 0);

    telegramFixture.failures.push({ ok: false, error_code: 429, parameters: { retry_after: 1 } });

    await sendMessage(state.client, 1001, 'Test message', controller.signal);

    const requests = telegramFixture.requests;
    const last = requests.at(-1);
    const previous = requests.at(-2);

    assert.deepEqual(last, previous);

    telegramFixture.failures.push({ ok: false, error_code: 401, description: config.botToken });

    await assert.rejects(requestTelegram(state.client, 'getMe', {}, controller.signal), /Telegram getMe failed \(code 401\)/);

    await writeFile(config.usersFile, 'invalid JSON');

    await assert.rejects(loadUsers(config.usersFile), /invalid JSON/);

    telegramFixture.webhookUrl = 'https://example.com/webhook';

    await assert.rejects(createTelegramState(config, controller.signal), /has a webhook/);
  } finally {
    controller.abort();

    mock.restoreAll();

    await rm(directory, { recursive: true, force: true });
  }
};

test('Telegram membership, persistence, private-chat restrictions, and API retries', { timeout: 15000 }, verifyTelegram);
