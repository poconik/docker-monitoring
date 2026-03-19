import escapeHtml from './escapeHtml.js';
import prettyLog from '../logging/prettyLog.js';
import type { LogEntry } from '../types/logging/logEntry.js';

const formatLogMessages = (entry: LogEntry): string[] => {
  const name = entry.containerName;
  const heading = `<b>Container:</b> ${escapeHtml(name)}\n<b>Time:</b> ${escapeHtml(entry.timestamp)}\n\n`;
  const content = prettyLog(entry.message);
  const messages: string[] = [];
  let offset = 0;

  do {
    let end = Math.min(offset + 3500, content.length);
    const code = content.charCodeAt(end - 1);

    if (end < content.length && code >= 0xD800 && code <= 0xDBFF) {
      end -= 1;
    }

    messages.push(`${heading}<pre>${escapeHtml(content.slice(offset, end))}</pre>`);

    offset = end;
  } while (offset < content.length);

  return messages;
};

export default formatLogMessages;
