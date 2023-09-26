import time from './time';
import json from './json';
import encodings from './encodings';
import async from './async';

export default {
  ...time,
  ...json,
  ...encodings,
  ...async,
};
