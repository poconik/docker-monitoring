import loadUsers from './loadUsers.js';
import saveUsers from './saveUsers.js';
import requestTelegram from './requestTelegram.js';
import reportStatus from '../logging/reportStatus.js';
import type { TelegramState } from '../types/telegram/telegramState.js';
import type { TelegramConfig } from '../types/telegram/telegramConfig.js';

const createTelegramState = async (config: TelegramConfig, signal: AbortSignal): Promise<TelegramState> => {
  const client = { token: config.botToken, pending: Promise.resolve(), lastSentAt: 0 };

  await requestTelegram(client, 'getMe', {}, signal);

  const webhook = await requestTelegram<{ url: string }>(client, 'getWebhookInfo', {}, signal);

  if (webhook.url) {
    throw new Error('This Telegram bot has a webhook. Remove it or use a dedicated bot for this monitor.');
  }

  const users = await loadUsers(config.usersFile);

  await saveUsers(users);

  reportStatus(`Telegram connected. Loaded ${users.chatIds.size} subscriber(s).`);

  return { client, config, users, queue: [], attempts: new Map(), lastOverflowAt: 0 };
};

export default createTelegramState;
