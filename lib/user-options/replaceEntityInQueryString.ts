import { replace } from 'lodash/fp';
import { Entity } from '../types';

const replaceEntityInQueryString = (entity: Entity, queryString: string) =>
  replace(/{{ENTITY}}/gi, escapeQuotes(entity.value), queryString);

const escapeQuotes = replace(/(\r\n|\n|\r)/gm, '');

export default replaceEntityInQueryString;