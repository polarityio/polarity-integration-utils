import ConditionalOptionRequirement from "./ConditionalOptionRequirement";

type OptionRequirements = [OptionRequirement, ...OptionRequirement[]];
export type OptionRequirement = OptionValidation | RelationshipValidation;

export type OptionValidation =
  | OptionKeyRequiredValidation
  | MessageAndOperatorCapableOptionValidation;

type OptionKeyRequiredValidation = string;

type MessageAndOperatorCapableOptionValidation = {
  option: string;
  message?: string;

  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;

  pattern?: string;

  format?: string;
};

type RelationshipValidation = OrRelationshipValidation | IfRelationshipValidation;

type OrRelationshipValidation = {
  or: [PossibleOrItem, PossibleOrItem, ...PossibleOrItem[]];
  message?: string;
};

export type PossibleOrItem = OptionValidation | AndRelationshipValidation;

export type AndRelationshipValidation = {
  and: [OptionValidation, OptionValidation, ...OptionValidation[]];
  message?: string;
};

type IfRelationshipValidation = {
  if: ConditionalOptionRequirement;
  then?: OptionValidation;
  else?: OptionValidation;
};

export default OptionRequirements;
