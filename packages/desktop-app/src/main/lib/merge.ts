export async function* merge<T>(generators: AsyncGenerator<T>[]) {
  const next = (generator: AsyncGenerator<T>) =>
    generator.next().then((result) => ({ ...result, generator }));

  const promises = new Map(
    generators.map((generator) => [generator, next(generator)]),
  );

  while (promises.size > 0) {
    const { done, value, generator } = await Promise.race(promises.values());

    promises.delete(generator);

    if (!done) {
      yield value;
      promises.set(generator, next(generator));
    }
  }
}
