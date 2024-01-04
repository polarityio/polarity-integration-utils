import {
  ConfigUserOptions,
  OptionRequirements,
} from './types';



const validateOptionRequirements = (
  configUserOptions: ConfigUserOptions,
  optionRequirements: OptionRequirements
): void => {
  /*
  - Booleans only valid RelationshipValidation, and only as a string requirement
  - format and pattern operators not valid in numbers
  - only operators format and pattern are valid for non-multiple select only 
    in RelationshipValidation, otherwise no operators allowed 
  - no operators valid for non-multiple select in RelationshipValidation 
  - with if validation, either the then or the else properties are required
  */
  // throw new Error('asdf')
};


export default validateOptionRequirements;
