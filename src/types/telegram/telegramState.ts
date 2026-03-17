import type { UserStore } from './userStore.js';
import type { QueuedLog } from './queuedLog.js';
import type { TelegramClient } from './telegramClient.js';
import type { TelegramConfig } from './telegramConfig.js';

export interface TelegramState {
  client: TelegramClient;
  config: TelegramConfig;
  users: UserStore;
  queue: QueuedLog[];
  attempts: Map<number, { count: number; until: number }>;
  lastOverflowAt: number;
}
