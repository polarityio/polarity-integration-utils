const parallelLimit = async (
  tasksQueue: Array<() => Promise<unknown>>,
  simultaneousTaskRunningLimit: number,
  returnErrors: boolean = false
) => {
  const results = [];

  const runTasks = async (tasksIterator) => {
    for (const [index, task] of tasksIterator) {
      try {
        results[index] = await task();
      } catch (error) {
        if (returnErrors) results[index] = error;
        else throw error;
      }
    }
  };

  const workers = new Array(simultaneousTaskRunningLimit)
    .fill(tasksQueue.entries())
    .map(runTasks);

  await Promise.allSettled(workers);

  return results;
};

export default parallelLimit;
