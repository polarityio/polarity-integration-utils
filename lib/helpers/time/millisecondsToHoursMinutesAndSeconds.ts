const millisecondsToHoursMinutesAndSeconds = (milliseconds: number | string = 0) => {
  if (typeof milliseconds !== 'number' || isNaN(milliseconds)) {
    throw new Error(
      `Cannot calculate Hours, Minutes, or Seconds from non-number input: \`${milliseconds}\``
    );
  }
  let remainingMilliseconds = milliseconds;

  const seconds = Math.floor((remainingMilliseconds / 1000) % 60);
  remainingMilliseconds -= seconds * 1000;

  const minutes = Math.floor((remainingMilliseconds / 60000) % 60);
  remainingMilliseconds -= minutes * 60000;

  const hours = Math.floor(remainingMilliseconds / 3600000);

  return (
    (hours ? `${hours} hours${minutes || seconds ? ', ' : ''}` : '') +
    (minutes ? `${minutes} minutes${seconds ? ', ' : ''}` : '') +
    (seconds ? `${seconds} seconds` : '') +
    (!hours && !minutes && !seconds ? `${milliseconds}ms` : '')
  );
};

export default millisecondsToHoursMinutesAndSeconds;
