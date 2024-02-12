import { Entity } from "../../types";

export type DoLookupResponse = {
  entity: Entity,
  displayValue?: string,
  isVolatile?: boolean,
  data: null | {
    summary?: string[],
    details: any
  }
};
