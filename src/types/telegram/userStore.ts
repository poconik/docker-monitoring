export interface UserStore {
  path: string;
  chatIds: Set<number>;
  updateOffset: number;
}
