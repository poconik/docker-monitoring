const reportStatus = (message: string): void => {
  console.error(JSON.stringify({ timestamp: new Date().toISOString(), source: 'monitor', level: 'info', message }));
};

export default reportStatus;
