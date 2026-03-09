import type { LogEntry } from './logEntry.js';

export type LogSink = (entry: LogEntry) => void;
