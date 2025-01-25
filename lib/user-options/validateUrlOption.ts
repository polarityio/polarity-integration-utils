import { get } from 'lodash/fp';
import { ValidationError, ValidateOptionsUserOptions } from './types';

/**
 *
 * @param {object} options - User Options from the inside of validate options
 *   e.g. each user option contains a metadata object including the value
 *   { userOption1: { value: 'user option input' ...moreOptionMetadata } }
 * @param {string} urlKey - [ default='url' ] The key of the url inside the user options
 *   defined via the `./config/config.js(on)` `options.?.key` property value.
 *   Generally if there is only 1 url user option, the `key` property should be set to
 *   `url` so the default option here can be used. If there are more than 1 url in the
 *   user options giving the `options.?.key` properties different value is expected.
 * @param {array<objects>} otherValidationErrors - [ default=[] ] Allows you to pass in
 *   existing validation error objects that will have any new validation errors found
 *   added onto the end before returned.
 *   [
 *     {
 *       key: 'otherUserOptionKey',
 *       message: 'Description of something wrong with the users input for this user option.'
 *     }
 *   ]
 *
 * @returns {array<objects> || throws} Any URL based Validation Error found in relation to the user option
 *   for the `urlKey` param found on the `options param
 *   [
 *     ...otherValidationErrors
 *     {
 *       key: 'url',
 *       message: '* Required'
 *     },
 *     // OR
 *     {
 *       key: 'url',
 *       message: 'Your Url must not end with a //'
 *     },
 *     // OR
 *     {
 *       key: 'url',
 *       message: 'What is currently provided is not a valid URL. You must provide a valid Instance URL.'
 *     },
 *   ]
 */
const validateUrlOption = (
  options: ValidateOptionsUserOptions,
  urlKey: string = 'url',
  otherValidationErrors: ValidationError[] = []
) => {
  const urlValue = get([urlKey, 'value'], options) as string;

  if (urlValue === undefined) {
    throw new Error(
      `User Option key \`${urlKey}\` is not defined in the config.js.  ` +
        "It's also possible you need to change the package.json version for the client to pick up your `config/config.js` changes."
    );
  }

  let allValidationErrors = otherValidationErrors;
  // TODO: Add support & tests for non-required urls or remove the `required` input value check if the situation where desire for use of this feature is encountered
  if (!urlValue) {
    allValidationErrors = allValidationErrors.concat({
      key: urlKey,
      message: '* Required'
    });
  }

  if (urlValue.endsWith('//')) {
    allValidationErrors = allValidationErrors.concat({
      key: urlKey,
      message: 'Your URL must not end with a //'
    });
  }

  if (urlValue) {
    try {
      new URL(urlValue);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (parseError) {
      allValidationErrors = allValidationErrors.concat({
        key: urlKey,
        message:
          'What is currently provided is not a valid URL. You must provide a valid Instance URL.'
      });
    }
  }

  return allValidationErrors;
};

export default validateUrlOption;
