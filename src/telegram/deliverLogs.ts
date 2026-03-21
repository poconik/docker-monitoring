import { setTimeout } from 'node:timers/promises';

import sendMessage from './sendMessage.js';
import reportError from '../logging/reportError.js';
import type { TelegramState } from '../types/telegram/telegramState.js';

const deliverLogs = async (state: TelegramState, signal: AbortSignal): Promise<void> => {
  try {
    while (!signal.aborted) {
      const log = state.queue.shift();

      if (!log) {
        await setTimeout(100, undefined, { signal });

        continue;
      }

      for (const chatId of log.chatIds) {
        for (const message of log.messages) {
          if (signal.aborted || !state.users.chatIds.has(chatId)) {
            break;
          }

          try {
            await sendMessage(state.client, chatId, message, signal, true);
          } catch (error) {
            if (signal.aborted) {
              return;
            }

            if (error instanceof Error && [401, 404].includes(Number(error.cause))) {
              throw error;
            }

            reportError(error);

            break;
          }
        }
      }
    }
  } catch (error) {
    if (!signal.aborted) {
      throw error;
    }
  }
};

export default deliverLogs;
