export interface LogEntry {
  timestamp: string;
  containerId: string;
  containerName: string;
  stream: 'stdout' | 'stderr';
  message: string;
}
