import { setTimeout } from 'node:timers/promises';

import reportError from '../logging/reportError.js';
import reportStatus from '../logging/reportStatus.js';
import type { Config } from '../types/config/config.js';
import listContainers from '../docker/listContainers.js';
import type { LogSink } from '../types/logging/logSink.js';
import type { Watcher } from '../types/monitor/watcher.js';
import followContainer from '../docker/followContainer.js';

const runMonitor = async (config: Config, signal: AbortSignal, sink: LogSink): Promise<void> => {
  const watchers = new Map<string, Watcher>();
  let connected = false;

  try {
    while (!signal.aborted) {
      try {
        const containers = await listContainers(config, signal);
        const currentIds = new Set<string>();

        if (!connected) {
          reportStatus(`Docker connected. Found ${containers.length} running container(s).`);

          connected = true;
        }

        for (const container of containers) {
          currentIds.add(container.id);

          const existing = watchers.get(container.id);

          if (existing?.active) {
            continue;
          }

          const watcher: Watcher = {
            controller: new AbortController(),
            task: Promise.resolve(),
            active: true,
            since: existing?.since,
          };

          watchers.set(container.id, watcher);

          watcher.task = followContainer(container, config, watcher, sink);
        }

        for (const [id, watcher] of watchers) {
          if (!currentIds.has(id) && watcher.active) {
            reportStatus(`Container ${id.slice(0, 12)} stopped or left the selected set.`);

            watcher.controller.abort();

            await watcher.task;
          }
        }
      } catch (error) {
        if (signal.aborted) {
          break;
        }

        if (!connected) {
          throw error;
        }

        reportError(error);
      }

      await setTimeout(config.pollIntervalMs, undefined, { signal });
    }
  } catch (error) {
    if (!signal.aborted) {
      throw error;
    }
  } finally {
    for (const watcher of watchers.values()) {
      watcher.controller.abort();
    }

    for (const watcher of watchers.values()) {
      await watcher.task;
    }

    reportStatus('Monitor stopped.');
  }
};

export default runMonitor;
