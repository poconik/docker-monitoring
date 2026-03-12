import readConfig from './config/readConfig.js';
import runMonitor from './monitor/runMonitor.js';
import reportError from './logging/reportError.js';
import consoleSink from './logging/consoleSink.js';
import loadEnvironment from './config/loadEnvironment.js';

const controller = new AbortController();
const stop = controller.abort.bind(controller);

process.once('SIGINT', stop);
process.once('SIGTERM', stop);

try {
  loadEnvironment();

  await runMonitor(readConfig(process.env), controller.signal, consoleSink);
} catch (error) {
  if (!controller.signal.aborted) {
    reportError(error);

    process.exitCode = 1;
  }
} finally {
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
}
