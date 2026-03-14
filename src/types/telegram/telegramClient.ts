export interface TelegramClient {
  token: string;
  pending: Promise<void>;
  lastSentAt: number;
}
