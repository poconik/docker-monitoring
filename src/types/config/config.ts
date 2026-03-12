import type { TelegramConfig } from '../telegram/telegramConfig.js';

export interface Config {
  pollIntervalMs: number;
  tailLines: number;
  containerName: string | undefined;
  telegram: TelegramConfig | undefined;
}
