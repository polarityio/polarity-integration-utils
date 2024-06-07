import time from './time';
import json from './json';
import encodings from './encodings';
import async from './async';
import entity from './entity';
import polarityResults from './polarity-results';

export default {
  ...time,
  ...json,
  ...encodings,
  ...polarityResults,
  ...entity,
  ...async,
};
