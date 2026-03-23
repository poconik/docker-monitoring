import test from 'node:test';
import assert from 'node:assert/strict';

import prettyLog from '../dist/logging/prettyLog.js';
import decodeLogMessage from './decodeLogMessage.js';
import redactSecrets from '../dist/logging/redactSecrets.js';
import formatLogMessages from '../dist/telegram/formatLogMessages.js';

const verifyTelegramFormat = () => {
  const entry = {
    timestamp: '2026-01-01T00:00:00.000000000Z',
    containerId: 'worker-id',
    containerName: 'worker',
    stream: 'stderr',
    message: '  original <text> & `code`\nnext line  ',
  };

  const [message] = formatLogMessages(entry);

  assert.equal(message, '<b>Container:</b> worker\n<b>Time:</b> 2026-01-01T00:00:00.000000000Z\n\n<pre>  original &lt;text&gt; &amp; `code`\nnext line  </pre>');

  const json = '{"level":60,"msg":"Worker failed","err":{"message":"Connection failed","stack":"line1\\nline2","reason":{"servers":[]}},"id":900719925474099312345,"values":[{},[],true,null]}';
  const formatted = prettyLog(json);

  assert.match(formatted, /\n  "level": 60,/);
  assert.match(formatted, /"id": 900719925474099312345/);
  assert.match(formatted, /"stack": "line1\\nline2"/);
  assert.deepEqual(JSON.parse(formatted), JSON.parse(json));
  assert.equal(prettyLog('{invalid json'), '{invalid json');

  const longMessage = 'x'.repeat(3499) + '😀' + '<&>'.repeat(3000);
  const chunks = formatLogMessages({ ...entry, message: longMessage });
  let restored = '';

  for (const chunk of chunks) {
    const content = decodeLogMessage(chunk);

    assert.ok(content.length <= 3500);
    assert.equal(content.isWellFormed(), true);
    assert.ok(chunk.startsWith('<b>Container:</b> worker\n<b>Time:</b> '));

    restored += content;
  }

  assert.equal(restored, longMessage);
  assert.equal(redactSecrets('token=123:secret password=access-key', ['123:secret', 'access-key']), 'token=[REDACTED] password=[REDACTED]');
};

test('formats only container, time, and complete log content in a code block', verifyTelegramFormat);
