import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, rename, rm } from 'node:fs/promises';

import type { UserStore } from '../types/telegram/userStore.js';

const saveUsers = async (store: UserStore): Promise<void> => {
  const temporaryPath = `${store.path}.${randomUUID()}.tmp`;
  const content = JSON.stringify({ chatIds: [...store.chatIds], updateOffset: store.updateOffset }, null, 2) + '\n';

  await mkdir(dirname(store.path), { recursive: true, mode: 0o700 });

  try {
    await writeFile(temporaryPath, content, { mode: 0o600, flag: 'wx' });
    await rename(temporaryPath, store.path);
  } finally {
    await rm(temporaryPath, { force: true });
  }
};

export default saveUsers;
