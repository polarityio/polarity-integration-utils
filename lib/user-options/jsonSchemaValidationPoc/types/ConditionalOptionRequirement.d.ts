export type ConditionalOptionRequirement =
  | ConditionalOptionValidation
  | ConditionalOrRelationshipValidation
  | ConditionalAndRelationshipValidation;

export type ConditionalOptionValidation =
  | string
  | {
      option: string;

      gt?: number;
      gte?: number;
      lt?: number;
      lte?: number;

      pattern?: string;

      format?: boolean;
    };

type ConditionalAndRelationshipValidation = {
  and: [
    ConditionalOptionValidation,
    ConditionalOptionValidation,
    ...ConditionalOptionValidation[]
  ];
};

export type ConditionalOrRelationshipValidation = {
  or: [
    PossibleConditionalOrItem,
    PossibleConditionalOrItem,
    ...PossibleConditionalOrItem[]
  ];
};

type PossibleConditionalOrItem =
  | ConditionalOptionValidation
  | ConditionalAndRelationshipValidation;

export default ConditionalOptionRequirement;
