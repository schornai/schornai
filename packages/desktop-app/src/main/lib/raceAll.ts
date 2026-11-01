// FROM https://stackoverflow.com/a/70060038

export async function* raceAll<T>(input: Promise<T>[]) {
  const promises: Promise<T>[] = [];
  const resolvers: ((arg: T | PromiseLike<T>) => void)[] = [];
  for (const p of input) {
    promises.push(
      new Promise((resolve) => {
        resolvers.push(resolve);
      }),
    );
    p.finally(() => {
      resolvers.shift()?.(p);
    });
    // works equivalent to:
    // p.then(result => {
    //   resolvers.shift()(result);
    // }, error => {
    //   resolvers.shift()(Promise.reject(error));
    // });
  }

  for (const promise of promises) {
    yield promise;
  }
}
