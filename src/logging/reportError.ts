const reportError = (error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(JSON.stringify({ timestamp: new Date().toISOString(), source: 'monitor', level: 'error', message }));
};

export default reportError;
