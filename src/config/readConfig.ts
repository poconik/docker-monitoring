import type { Config } from '../types/config/config.js';

const readConfig = (environment: NodeJS.ProcessEnv): Config => {
  const pollIntervalMs = Number(environment.POLL_INTERVAL_MS ?? '3000');
  const tailLines = Number(environment.LOG_TAIL_LINES ?? '100');

  if (
    !Number.isSafeInteger(pollIntervalMs) ||
    pollIntervalMs < 250 ||
    pollIntervalMs > 2147483647
  ) {
    throw new Error('POLL_INTERVAL_MS must be an integer between 250 and 2147483647.');
  }

  if (!Number.isSafeInteger(tailLines) || tailLines < 0) {
    throw new Error('LOG_TAIL_LINES must be a non-negative integer.');
  }

  return {
    pollIntervalMs,
    tailLines,
    containerName: environment.CONTAINER_NAME || undefined,
  };
};

export default readConfig;
