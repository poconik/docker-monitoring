export interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    date: number;
    chat: { id: number; type: string };
    from?: { id: number; is_bot?: boolean };
  };
}
