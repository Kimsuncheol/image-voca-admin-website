export function chunkItems<T>(
  items: readonly T[],
  batchSize: number,
): T[][] {
  const normalizedBatchSize = Math.max(1, Math.floor(batchSize));
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += normalizedBatchSize) {
    batches.push(items.slice(index, index + normalizedBatchSize));
  }

  return batches;
}

export function countBatches(
  itemCount: number,
  batchSize: number,
): number {
  if (itemCount <= 0) return 0;
  return Math.ceil(itemCount / Math.max(1, Math.floor(batchSize)));
}

export async function mapWithConcurrencyLimit<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const limit = Math.max(1, Math.floor(concurrency));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) return;

      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => runWorker()),
  );

  return results;
}

export async function runBatches<T, R>(
  items: readonly T[],
  options: {
    batchSize: number;
    batchConcurrency: number;
    worker: (batch: readonly T[], index: number) => Promise<R>;
  },
): Promise<R[]> {
  const batches = chunkItems(items, options.batchSize);

  return mapWithConcurrencyLimit(
    batches,
    options.batchConcurrency,
    (batch, index) => options.worker(batch, index),
  );
}
