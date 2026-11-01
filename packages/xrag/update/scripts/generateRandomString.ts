// FROM https://github.com/supabase/supabase/blob/794529eddf3e9d454fa2bbc169768bfd2a853d67/apps/docs/components/JwtGenerator/JwtGenerator.tsx

export function generateRandomString(length: number) {
  const CHARS =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  /**
   * The number of possible Uint8 integers is 256. Since the length of `CHARS`
   * doesn't fit exactly into 256, simply taking the modulus would create an
   * uneven distribution that favors the earlier characters. To make a truly
   * uniform distribution, we have to discard everything above the last full
   * cycle, and pick again.
   *
   * The minus 1 is to account for 0-indexing.
   */
  const MAX = Math.floor(256 / CHARS.length) * CHARS.length - 1;

  const randomUInt8Array = new Uint8Array(1);

  for (let i = 0; i < length; i++) {
    let randomNumber: number;
    do {
      crypto.getRandomValues(randomUInt8Array);
      randomNumber = randomUInt8Array[0]!;
      /**
       * Keep picking until we get a number in the valid range.
       */
    } while (randomNumber > MAX);

    result += CHARS[randomNumber % CHARS.length];
  }

  return result;
}
