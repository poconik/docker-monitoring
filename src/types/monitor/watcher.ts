import type { LogEntry } from '../logging/logEntry.js';
import type { LogCursor } from '../docker/logCursor.js';

export interface Watcher {
  controller: AbortController;
  task: Promise<void>;
  active: boolean;
  cursors: Record<LogEntry['stream'], LogCursor>;
}
