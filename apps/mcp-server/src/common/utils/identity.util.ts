import { createHash } from "node:crypto";

function toUuidFromHex(hex: string): string {
  const normalized = hex.slice(0, 32);
  const part1 = normalized.slice(0, 8);
  const part2 = normalized.slice(8, 12);
  const part3 = `5${normalized.slice(13, 16)}`;
  const part4 = `a${normalized.slice(17, 20)}`;
  const part5 = normalized.slice(20, 32);
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

export function deterministicUuid(namespace: string, value: string): string {
  const hash = createHash("sha256").update(`${namespace}:${value}`).digest("hex");
  return toUuidFromHex(hash);
}
