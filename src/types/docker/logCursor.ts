export interface LogCursor {
  timestamp: string | undefined;
  entries: Map<string, number>;
}
