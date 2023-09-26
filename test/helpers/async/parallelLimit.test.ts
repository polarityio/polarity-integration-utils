import parallelLimit from '../../../lib/helpers/async/parallelLimit';

/*
foo = (x, j) => async ()=> new Promise((res, rej) => setTimeout(y => j ? rej('error') : res('foo'), x)

console.time('foo'); limit([foo(3000),foo(3000),foo(3000),foo(3000)], 1).then(x => { console.log(x); console.timeEnd('foo');}); 
12 seconds
console.time('foo'); limit([foo(3000),foo(3000),foo(3000),foo(3000)], 2).then(x => { console.log(x); console.timeEnd('foo');});
6 seconds
*/

jest.useFakeTimers();
jest.spyOn(global, 'setTimeout');

describe('parallelLimit', () => {
  it('should run all of the functions and return the results from each function in an array', async () => {
    const result = await parallelLimit([async () => 1, async () => 2, async () => 3], 3);
    expect(result).toEqual([1, 2, 3]);
  });
  it('should wait for task functions to finish', () => {
    parallelLimit(
      [
        async () => new Promise((res) => setTimeout(() => res('foo'), 1000)),
        async () => new Promise((res) => setTimeout(() => res('bar'), 1000))
      ],
      2
    );
    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000);
  });
  it('should throw an error if one of the function throws an error', async () => {
    try {
      await parallelLimit(
        [
          async () => 1,
          async () => {
            throw new Error('failed');
          }
        ],
        2
      );
    } catch (e) {
      expect(e.message).toBe('failed');
    }
  });
  it.skip('should stop the remainder of the task queue if one of the function throws an error', async () => {
    //TODO
  });
  it('should return an error if one of the function throws an error if the `returnErrors` parameter is set to true', async () => {
    const resultWithError = await parallelLimit(
      [
        async () => 1,
        async () => {
          throw new Error('failed');
        }
      ],
      2,
      true
    );

    expect(resultWithError).toHaveLength(2);
    expect(resultWithError[0]).toBe(1)
    expect(resultWithError[1]).toBeInstanceOf(Error);
    expect(resultWithError[1].message).toBe('failed')
  });
  it.skip('should run all tasks in parallel if the `simultaneousTaskRunningLimit` is greater than or equal to the number of tasks', async () => {
    //TODO
  });
  it.skip('should run wait to run each task until the previous is finished if the `simultaneousTaskRunningLimit` is 1', async () => {
    //TODO
  });
  it.skip('should start the next task in the queue until one of the current tasks is finished and a slot opens up', async () => {
    //TODO
  });
});
