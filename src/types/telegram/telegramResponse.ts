export interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  error_code?: number;
  parameters?: { retry_after?: number };
}
