import ignoreFailure from './ignoreFailure.js';
import deliverMessage from './deliverMessage.js';
import type { TelegramClient } from '../types/telegram/telegramClient.js';

const sendMessage = (
  client: TelegramClient,
  chatId: number,
  text: string,
  signal: AbortSignal,
  formatted: boolean = false,
): Promise<void> => {
  const task = client.pending.then(deliverMessage.bind(null, client, chatId, text, signal, formatted));

  client.pending = task.catch(ignoreFailure);

  return task;
};

export default sendMessage;
