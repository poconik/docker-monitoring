import { createHash, timingSafeEqual } from 'node:crypto';

const passwordMatches = (candidate: string, expected: string): boolean => {
  const candidateHash = createHash('sha256').update(candidate).digest();
  const expectedHash = createHash('sha256').update(expected).digest();

  return timingSafeEqual(candidateHash, expectedHash);
};

export default passwordMatches;
