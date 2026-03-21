import readConfig from './config/readConfig.js';
import runApplication from './runApplication.js';
import reportError from './logging/reportError.js';
import loadEnvironment from './config/loadEnvironment.js';

const controller = new AbortController();
const stop = controller.abort.bind(controller);

process.once('SIGINT', stop);
process.once('SIGTERM', stop);

try {
  loadEnvironment();

  await runApplication(readConfig(process.env), controller);
} catch (error) {
  if (!controller.signal.aborted) {
    reportError(error);

    process.exitCode = 1;
  }
} finally {
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
}
