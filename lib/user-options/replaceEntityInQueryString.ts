import { replace } from 'lodash/fp';
import type { Entity } from '../types';

/**
 * @alpha
 * @param entity - entity value to be placed into query string
 * @param queryString - query string to run replacement over
 */
const replaceEntityInQueryString = (entity: Entity, queryString: string) =>
  replace(/{{ENTITY}}/gi, escapeQuotes(entity.value), queryString);

const escapeQuotes = replace(/(\r\n|\n|\r)/gm, '');

export default replaceEntityInQueryString;