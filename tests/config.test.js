import test from 'node:test';
import assert from 'node:assert/strict';

import readConfig from '../dist/config/readConfig.js';

const verifyConfig = () => {
  assert.deepEqual(readConfig({}), {
    pollIntervalMs: 3000,
    tailLines: 5,
    containerName: undefined,
    excludedContainerNames: [],
    telegram: undefined,
  });

  for (const value of ['0', '-1', '250.5', 'invalid', '2147483648']) {
    assert.throws(readConfig.bind(null, { POLL_INTERVAL_MS: value }), /POLL_INTERVAL_MS/);
  }

  for (const value of ['-1', '1.5', 'invalid']) {
    assert.throws(readConfig.bind(null, { LOG_TAIL_LINES: value }), /LOG_TAIL_LINES/);
  }

  assert.equal(readConfig({ LOG_TAIL_LINES: '0' }).tailLines, 0);
  assert.equal(readConfig({ CONTAINER_NAME: 'web' }).containerName, 'web');
  assert.deepEqual(readConfig({ CONTAINER_EXCLUDE_NAMES: ' mongo, rabbitmq, ,' }).excludedContainerNames, ['mongo', 'rabbitmq']);

  assert.throws(readConfig.bind(null, { TELEGRAM_BOT_TOKEN: '123:test' }), /Set both/);
  assert.throws(readConfig.bind(null, { TELEGRAM_ACCESS_PASSWORD: 'test-password' }), /Set both/);

  const config = readConfig({ TELEGRAM_BOT_TOKEN: '123:test', TELEGRAM_ACCESS_PASSWORD: 'test-password' });

  assert.equal(config.telegram.usersFile, 'data/users.json');
};

test('configuration validates intervals and tail counts', verifyConfig);
