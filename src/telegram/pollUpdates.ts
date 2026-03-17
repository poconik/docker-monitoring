import { setTimeout } from 'node:timers/promises';

import saveUsers from './saveUsers.js';
import handleUpdate from './handleUpdate.js';
import requestTelegram from './requestTelegram.js';
import reportError from '../logging/reportError.js';
import type { TelegramState } from '../types/telegram/telegramState.js';
import type { TelegramUpdate } from '../types/telegram/telegramUpdate.js';

const pollUpdates = async (state: TelegramState, signal: AbortSignal): Promise<void> => {
  while (!signal.aborted) {
    try {
      const updates = await requestTelegram<TelegramUpdate[]>(state.client, 'getUpdates', {
        offset: state.users.updateOffset,
        timeout: 25,
        allowed_updates: ['message'],
      }, signal);

      for (const update of updates) {
        if (update.update_id < state.users.updateOffset) {
          continue;
        }

        try {
          await handleUpdate(state, update, signal);
        } catch (error) {
          if (!(error instanceof Error) || ![400, 403].includes(Number(error.cause))) {
            throw error;
          }

          reportError(error);
        }

        const updateOffset = update.update_id + 1;

        await saveUsers({ ...state.users, updateOffset });

        state.users.updateOffset = updateOffset;
      }

      if (updates.length === 0) {
        await setTimeout(250, undefined, { signal });
      }
    } catch (error) {
      if (signal.aborted) {
        return;
      }

      if (error instanceof Error && [401, 404, 409].includes(Number(error.cause))) {
        throw error;
      }

      reportError(error);

      await setTimeout(3000, undefined, { signal });
    }
  }
};

export default pollUpdates;
