import consoleSink from '../logging/consoleSink.js';
import reportError from '../logging/reportError.js';
import formatLogMessages from './formatLogMessages.js';
import redactSecrets from '../logging/redactSecrets.js';
import type { LogEntry } from '../types/logging/logEntry.js';
import type { TelegramState } from '../types/telegram/telegramState.js';

const enqueueLog = (state: TelegramState, entry: LogEntry): void => {
  const secrets = [state.config.botToken, state.config.accessPassword];

  const sanitized: LogEntry = {
    ...entry,
    containerName: redactSecrets(entry.containerName, secrets),
    message: redactSecrets(entry.message, secrets),
  };

  consoleSink(sanitized);

  if (state.users.chatIds.size === 0) {
    return;
  }

  if (state.queue.length >= 500) {
    state.queue.shift();

    if (Date.now() - state.lastOverflowAt > 60000) {
      reportError(new Error('Telegram queue is full. The oldest pending log was dropped.'));

      state.lastOverflowAt = Date.now();
    }
  }

  state.queue.push({ messages: formatLogMessages(sanitized), chatIds: [...state.users.chatIds] });
};

export default enqueueLog;
