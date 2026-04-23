// Re-export utils-specific types
export { IntegrationError } from './errors';

/**
 * Integration config.json type
 * @public
 */
export interface IntegrationConfig {
  polarityIntegrationUuid: string;
  name: string;
  acronym: string;
  description?: string;
  defaultColor?: string;
  entityTypes?: string[];
  dataTypes?: (string | CustomType)[];
  customTypes?: CustomType[];
  supportsAdditionalCustomTypes?: boolean;
  styles?: string[];
  block: ViewComponent;
  summary?: ViewComponent;
  onDemandOnly?: boolean;
  copyOnDemand?: boolean;
  logging?: {
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  };
  request?: {
    cert?: string;
    key?: string;
    passphrase?: string;
    ca?: string;
    proxy?: string;
    rejectUnauthorized?: boolean;
  };
  options?: IntegrationOption[];
}

/**
 * Custom entity type definition for config.json
 * @public
 */
export interface CustomType {
  type?: 'custom';
  name?: string;
  description?: string;
  key: string;
  regex: string;
  editable?: boolean;
  enabled?: boolean;
}

/**
 * View component reference in config.json
 * @public
 */
export interface ViewComponent {
  component: { file: string };
  template: { file: string };
}

/**
 * A select option item with display label and value
 * @public
 */
export interface SelectOptionItem {
  value: string;
  display: string;
}

/**
 * Integration option definition for config.json
 * @public
 */
export type IntegrationOption =
  | {
      type: 'text' | 'password';
      key: string;
      name: string;
      description?: string;
      default: string | null;
      userCanEdit?: boolean;
      adminOnly?: boolean;
    }
  | {
      type: 'boolean';
      key: string;
      name: string;
      description?: string;
      default: boolean | null;
      userCanEdit?: boolean;
      adminOnly?: boolean;
    }
  | {
      type: 'number';
      key: string;
      name: string;
      description?: string;
      default: number | null;
      userCanEdit?: boolean;
      adminOnly?: boolean;
    }
  | {
      type: 'select';
      key: string;
      name: string;
      description?: string;
      default: SelectOptionItem | SelectOptionItem[] | string | null;
      options: SelectOptionItem[];
      multiple?: boolean;
      userCanEdit: boolean;
      adminOnly: boolean;
    };
