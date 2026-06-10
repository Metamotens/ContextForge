import { createHash } from 'node:crypto';

export function buildDeterministicVector(input: string, size: number): number[] {
  const seed = input.trim().toLowerCase();
  const vector: number[] = [];

  for (let i = 0; i < size; i += 1) {
    const digest = createHash('sha256').update(`${seed}:${i}`).digest();
    const int = digest.readUInt32BE(0);
    const normalized = int / 0xffffffff;
    vector.push(Number(normalized.toFixed(6)));
  }

  return vector;
}
