import type { Readable } from 'node:stream';
import { createInterface } from 'node:readline';

import type { LogSink } from '../types/logging/logSink.js';
import type { Watcher } from '../types/monitor/watcher.js';
import type { LogEntry } from '../types/logging/logEntry.js';
import type { Container } from '../types/docker/container.js';

const readOutput = async (
  input: Readable,
  stream: LogEntry['stream'],
  container: Container,
  watcher: Watcher,
  sink: LogSink,
): Promise<void> => {
  const lines = createInterface({ input, crlfDelay: Infinity });
  const cursor = watcher.cursors[stream];
  const resumeTimestamp = cursor.timestamp;
  const replayEntries = new Map(cursor.entries);

  for await (const line of lines) {
    const separator = line.indexOf(' ');
    const timestamp = line.slice(0, separator);
    const hasTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{9}Z$/.test(timestamp);

    if (hasTimestamp && resumeTimestamp && timestamp < resumeTimestamp) {
      continue;
    }

    if (hasTimestamp && timestamp === resumeTimestamp) {
      const remaining = replayEntries.get(line) ?? 0;

      if (remaining > 0) {
        replayEntries.set(line, remaining - 1);

        continue;
      }
    }

    if (hasTimestamp && (!cursor.timestamp || timestamp > cursor.timestamp)) {
      cursor.timestamp = timestamp;

      cursor.entries.clear();
    }

    if (hasTimestamp && timestamp === cursor.timestamp) {
      cursor.entries.set(line, (cursor.entries.get(line) ?? 0) + 1);
    }

    sink({
      timestamp: hasTimestamp ? timestamp : new Date().toISOString(),
      containerId: container.id,
      containerName: container.name,
      stream,
      message: hasTimestamp ? line.slice(separator + 1) : line,
    });
  }
};

export default readOutput;
