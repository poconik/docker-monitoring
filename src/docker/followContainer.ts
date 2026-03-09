import { once } from 'node:events';
import { spawn } from 'node:child_process';

import readOutput from './readOutput.js';
import reportError from '../logging/reportError.js';
import reportStatus from '../logging/reportStatus.js';
import type { Config } from '../types/config/config.js';
import type { LogSink } from '../types/logging/logSink.js';
import type { Watcher } from '../types/monitor/watcher.js';
import type { Container } from '../types/docker/container.js';

const followContainer = async (
  container: Container,
  config: Config,
  watcher: Watcher,
  sink: LogSink,
): Promise<void> => {
  const args = ['logs', '--follow', '--timestamps'];

  if (watcher.since) {
    args.push('--since', watcher.since);
  } else {
    args.push('--tail', String(config.tailLines));
  }

  args.push(container.id);

  const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'], signal: watcher.controller.signal });

  try {
    reportStatus(`Following container ${container.name} (${container.id.slice(0, 12)}).`);

    const [result] = await Promise.all([
      once(child, 'close'),
      readOutput(child.stdout, 'stdout', container, watcher, sink),
      readOutput(child.stderr, 'stderr', container, watcher, sink),
    ]);

    if (result[0] !== 0 && !watcher.controller.signal.aborted) {
      reportError(new Error(`Log stream for ${container.name} exited with code ${String(result[0])}.`));
    }
  } catch (error) {
    if (!watcher.controller.signal.aborted) {
      reportError(error);
    }
  } finally {
    child.kill();

    watcher.active = false;
  }
};

export default followContainer;
