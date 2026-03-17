import saveUsers from './saveUsers.js';
import sendMessage from './sendMessage.js';
import passwordMatches from './passwordMatches.js';
import type { TelegramState } from '../types/telegram/telegramState.js';
import type { TelegramUpdate } from '../types/telegram/telegramUpdate.js';

const handleUpdate = async (state: TelegramState, update: TelegramUpdate, signal: AbortSignal): Promise<void> => {
  const message = update.message;

  if (
    !message?.text ||
    message.chat.type !== 'private' ||
    message.from?.is_bot ||
    message.from?.id !== message.chat.id
  ) {
    return;
  }

  const chatId = message.chat.id;
  const text = message.text.trim();
  const now = Date.now();

  if (text === '/stop' && state.users.chatIds.has(chatId)) {
    const chatIds = new Set(state.users.chatIds);

    chatIds.delete(chatId);

    await saveUsers({ ...state.users, chatIds });

    state.users.chatIds = chatIds;

    await sendMessage(state.client, chatId, 'You are unsubscribed from container logs.', signal);

    return;
  }

  for (const [id, attempt] of state.attempts) {
    if (attempt.until <= now) {
      state.attempts.delete(id);
    }
  }

  const attempt = state.attempts.get(chatId) ?? { count: 0, until: now + 60000 };

  if (attempt.count >= 5) {
    return;
  }

  attempt.count += 1;

  state.attempts.set(chatId, attempt);

  if (text === '/stop') {
    await sendMessage(state.client, chatId, 'You are not subscribed. Send /start to begin.', signal);

    return;
  }

  if (state.users.chatIds.has(chatId)) {
    await sendMessage(state.client, chatId, 'You are subscribed. Send /stop to unsubscribe.', signal);

    return;
  }

  const candidate = text.startsWith('/start ') ? text.slice(7).trim() : text;

  if (!passwordMatches(candidate, state.config.accessPassword)) {
    const reply = text === '/start' ? 'Send the access password to subscribe to container logs.' : 'Invalid access password.';

    await sendMessage(state.client, chatId, reply, signal);

    return;
  }

  const chatIds = new Set(state.users.chatIds);

  chatIds.add(chatId);

  await saveUsers({ ...state.users, chatIds });

  state.users.chatIds = chatIds;

  await sendMessage(state.client, chatId, 'Subscription enabled. Send /stop to unsubscribe.', signal);
};

export default handleUpdate;
