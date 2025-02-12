import { millisecondsToHoursMinutesAndSeconds } from '../../../lib/helpers/time/millisecondsToHoursMinutesAndSeconds';

const blankTime = '0ms';
const twoHoursInMilliseconds = 7200000;
const tenMinutesInMilliseconds = 600000;
const thirtyTwoSecondsInMilliseconds = 32000;
const subSecondMilliseconds = 872;
const twoHoursTenMinutesThirtyTwoSecondsInMilliseconds =
  twoHoursInMilliseconds + tenMinutesInMilliseconds + thirtyTwoSecondsInMilliseconds;

describe('millisecondsToHoursMinutesAndSeconds', () => {
  // Positive Test Cases
  it('should return correct Hours, Minutes, & Seconds in Array', () => {
    expect(millisecondsToHoursMinutesAndSeconds(twoHoursInMilliseconds)).toBe('2 hours');
    expect(millisecondsToHoursMinutesAndSeconds(tenMinutesInMilliseconds)).toBe(
      '10 minutes'
    );
    expect(millisecondsToHoursMinutesAndSeconds(thirtyTwoSecondsInMilliseconds)).toBe(
      '32 seconds'
    );
    expect(
      millisecondsToHoursMinutesAndSeconds(
        twoHoursTenMinutesThirtyTwoSecondsInMilliseconds
      )
    ).toBe('2 hours, 10 minutes, 32 seconds');
  });
  it('should not return millisecond remainder', () => {
    expect(
      millisecondsToHoursMinutesAndSeconds(
        twoHoursTenMinutesThirtyTwoSecondsInMilliseconds + subSecondMilliseconds
      )
    ).toBe('2 hours, 10 minutes, 32 seconds');
  });
  it('should return input Milliseconds if less than 1000', () => {
    expect(millisecondsToHoursMinutesAndSeconds(subSecondMilliseconds)).toBe(
      `${subSecondMilliseconds}ms`
    );
  });

  // Negative Test Cases
  it('should throw if non-number or non-undefined value is passed in', () => {
    const stringInput = 'This is not a Number';
    expect(() => millisecondsToHoursMinutesAndSeconds(stringInput)).toThrow(
      new Error(
        `Cannot calculate Hours, Minutes, or Seconds from non-number input: \`${stringInput}\``
      )
    );
  });
  it('should not throw if a number or undefined is passed in', () => {
    expect(() => millisecondsToHoursMinutesAndSeconds(9999999)).not.toThrow();
    expect(millisecondsToHoursMinutesAndSeconds).not.toThrow();
    expect(millisecondsToHoursMinutesAndSeconds()).toBe(blankTime);
  });
});
