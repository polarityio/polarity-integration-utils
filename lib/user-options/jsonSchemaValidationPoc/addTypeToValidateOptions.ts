import { flow, toPairs, fromPairs, map, find } from 'lodash/fp';
import {
  ConfigUserOption,
  ConfigUserOptions,
  PossibleOptionType,
  UserOption,
  UserOptions,
  ValidateOptionsUserOption,
  ValidateOptionsUserOptions
} from './types';

/**
 * This is needed as the type and value keys are needed for the custom schema creation
 * based on optionRequirements. Ideally we would receive the name, type, value, and multiple keys in the same
 * structure in the actual implementation
 */
const addTypeToValidateOptions = (
  configUserOptions: ConfigUserOptions,
  validateOptionsUserOptions: ValidateOptionsUserOptions
): UserOptions =>
  flow(
    toPairs,
    map(
      ([optionKey, optionWithoutType]: [string, ValidateOptionsUserOption]): [
        string,
        UserOption
      ] => {
        const thisOptionsConfigOption: ConfigUserOption = find(
          (configUserOption: ConfigUserOption): boolean =>
            configUserOption.key === optionKey,
          configUserOptions
        );

        const optionType: PossibleOptionType = thisOptionsConfigOption.type;
        const optionMultiple: boolean = thisOptionsConfigOption.multiple;

        const optionWithType: [string, UserOption] = [
          optionKey,
          {
            ...optionWithoutType,
            name: thisOptionsConfigOption.name,
            type: optionType,
            multiple: optionMultiple,
            value: !optionWithoutType.value ? null : optionWithoutType.value
          }
        ];

        return optionWithType;
      }
    ),
    fromPairs
  )(validateOptionsUserOptions);

export default addTypeToValidateOptions;
