import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

const loadEnvironment = (): void => {
  if (existsSync('.env')) {
    loadEnvFile('.env');
  }
};

export default loadEnvironment;
