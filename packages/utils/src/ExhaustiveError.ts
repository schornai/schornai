export class ExhaustiveError extends Error {
  constructor(value: never) {
    super(`ExhaustiveError: "${String(value)}"`);
  }
}
