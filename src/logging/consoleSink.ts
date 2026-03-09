import type { LogEntry } from '../types/logging/logEntry.js';

const consoleSink = (entry: LogEntry): void => {
  const line = JSON.stringify(entry) + '\n';

  if (entry.stream === 'stderr') {
    process.stderr.write(line);

    return;
  }

  process.stdout.write(line);
};

export default consoleSink;
