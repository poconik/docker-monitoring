import type { TelegramConfig } from '../types/telegram/telegramConfig.js';

const readTelegramConfig = (environment: NodeJS.ProcessEnv): TelegramConfig | undefined => {
  const botToken = environment.TELEGRAM_BOT_TOKEN?.trim();
  const accessPassword = environment.TELEGRAM_ACCESS_PASSWORD;

  if (!botToken && !accessPassword) {
    return undefined;
  }

  if (!botToken || !accessPassword?.trim()) {
    throw new Error('Set both TELEGRAM_BOT_TOKEN and TELEGRAM_ACCESS_PASSWORD to enable Telegram.');
  }

  if (!/^\d+:[A-Za-z0-9_-]+$/.test(botToken)) {
    throw new Error('TELEGRAM_BOT_TOKEN has an invalid format.');
  }

  if (accessPassword !== accessPassword.trim() || accessPassword.length > 256) {
    throw new Error('TELEGRAM_ACCESS_PASSWORD must be at most 256 characters without surrounding whitespace.');
  }

  return { botToken, accessPassword, usersFile: environment.TELEGRAM_USERS_FILE || 'data/users.json' };
};

export default readTelegramConfig;
