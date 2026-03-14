import { setTimeout } from 'node:timers/promises';

import type { TelegramClient } from '../types/telegram/telegramClient.js';
import type { TelegramResponse } from '../types/telegram/telegramResponse.js';

const requestTelegram = async <T>(
  client: TelegramClient,
  method: string,
  payload: Record<string, unknown>,
  signal: AbortSignal,
): Promise<T> => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    signal.throwIfAborted();

    let response: Response;

    try {
      response = await fetch(`https://api.telegram.org/bot${client.token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.any([signal, AbortSignal.timeout(35000)]),
      });
    } catch {
      if (signal.aborted || attempt === 2) {
        throw new Error(`Telegram ${method} connection failed.`);
      }

      await setTimeout(1000 * (attempt + 1), undefined, { signal });

      continue;
    }

    let body: TelegramResponse<T>;

    try {
      body = await response.json() as TelegramResponse<T>;
    } catch {
      throw new Error(`Telegram ${method} returned an invalid response.`);
    }

    if (response.ok && body.ok && body.result !== undefined) {
      return body.result;
    }

    const code = body.error_code ?? response.status;

    if ((code === 429 || code >= 500) && attempt < 2) {
      const delay = Math.min(Math.max(body.parameters?.retry_after ?? attempt + 1, 1), 3600) * 1000;

      await setTimeout(delay, undefined, { signal });

      continue;
    }

    throw new Error(`Telegram ${method} failed (code ${code}).`, { cause: code });
  }

  throw new Error(`Telegram ${method} failed.`);
};

export default requestTelegram;
