export interface Watcher {
  controller: AbortController;
  task: Promise<void>;
  active: boolean;
  since: string | undefined;
}
