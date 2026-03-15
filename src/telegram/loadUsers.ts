import { readFile } from 'node:fs/promises';

import type { UserStore } from '../types/telegram/userStore.js';

const loadUsers = async (path: string): Promise<UserStore> => {
  let content: string;

  try {
    content = await readFile(path, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return { path, chatIds: new Set(), updateOffset: 0 };
    }

    throw new Error('Cannot read the Telegram users file. Check its permissions.');
  }

  let data: unknown;

  try {
    data = JSON.parse(content);
  } catch {
    throw new Error('The Telegram users file contains invalid JSON.');
  }

  if (
    !data ||
    typeof data !== 'object' ||
    !('chatIds' in data) ||
    !Array.isArray(data.chatIds) ||
    !('updateOffset' in data) ||
    !Number.isSafeInteger(data.updateOffset) ||
    Number(data.updateOffset) < 0
  ) {
    throw new Error('The Telegram users file has an invalid structure.');
  }

  const chatIds = new Set<number>();

  for (const chatId of data.chatIds) {
    if (!Number.isSafeInteger(chatId) || chatId <= 0) {
      throw new Error('The Telegram users file contains an invalid private chat ID.');
    }

    chatIds.add(chatId);
  }

  return { path, chatIds, updateOffset: Number(data.updateOffset) };
};

export default loadUsers;
