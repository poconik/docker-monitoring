import { setTimeout } from 'node:timers/promises';

import requestTelegram from './requestTelegram.js';
import type { TelegramClient } from '../types/telegram/telegramClient.js';

const deliverMessage = async (
  client: TelegramClient,
  chatId: number,
  text: string,
  signal: AbortSignal,
  formatted: boolean,
): Promise<void> => {
  const delay = Math.max(0, client.lastSentAt + 1100 - Date.now());

  await setTimeout(delay, undefined, { signal });

  client.lastSentAt = Date.now();

  await requestTelegram(client, 'sendMessage', {
    chat_id: chatId,
    text,
    ...(formatted ? { parse_mode: 'HTML' } : {}),
    link_preview_options: { is_disabled: true },
  }, signal);
};

export default deliverMessage;
