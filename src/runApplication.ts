import runMonitor from './monitor/runMonitor.js';
import enqueueLog from './telegram/enqueueLog.js';
import consoleSink from './logging/consoleSink.js';
import pollUpdates from './telegram/pollUpdates.js';
import deliverLogs from './telegram/deliverLogs.js';
import type { Config } from './types/config/config.js';
import createTelegramState from './telegram/createTelegramState.js';

const runApplication = async (config: Config, parentController: AbortController): Promise<void> => {
  const controller = new AbortController();
  const signal = AbortSignal.any([parentController.signal, controller.signal]);

  if (!config.telegram) {
    await runMonitor(config, signal, consoleSink);

    return;
  }

  const state = await createTelegramState(config.telegram, signal);

  const tasks = [
    pollUpdates(state, signal),
    deliverLogs(state, signal),
    runMonitor(config, signal, enqueueLog.bind(null, state)),
  ];

  try {
    await Promise.all(tasks);
  } finally {
    controller.abort();

    await Promise.allSettled(tasks);
  }
};

export default runApplication;
