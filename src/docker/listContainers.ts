import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

import type { Config } from '../types/config/config.js';
import type { Container } from '../types/docker/container.js';

const listContainers = async (config: Config, signal: AbortSignal): Promise<Container[]> => {
  const args = ['ps', '--no-trunc', '--format', '{{.ID}}\t{{.Names}}\t{{.Label "docker-monitor.exclude"}}'];

  if (config.containerName) {
    args.push('--filter', `name=${config.containerName}`);
  }

  const { stdout } = await promisify(execFile)('docker', args, { signal, timeout: 10000, maxBuffer: 10485760 });
  const containers: Container[] = [];

  for (const line of stdout.trim().split('\n')) {
    if (!line) {
      continue;
    }

    const [id, name, excluded] = line.split('\t');

    if (excluded === 'true') {
      continue;
    }

    if (!id || !name) {
      throw new Error('Docker returned an invalid container listing.');
    }

    containers.push({ id, name });
  }

  return containers;
};

export default listContainers;
