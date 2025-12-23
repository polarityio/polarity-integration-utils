import { z } from 'zod';

export const ValidationErrorSchema = z.object({
  key: z.string(),
  message: z.string()
});

export const DropdownUserOptionValueSchema = z.object({
  display: z.string(),
  value: z.string()
});

export const PossibleUserOptionValueSchema = z.union([
  z.undefined(),
  z.string(),
  z.number(),
  z.boolean(),
  DropdownUserOptionValueSchema,
  z.array(DropdownUserOptionValueSchema)
]);

export const DoLookupUserOptionsSchema = z.record(
  z.string(),
  PossibleUserOptionValueSchema
);

export const ValidateOptionsUserOptionSchema = z.object({
  integration_id: z.string().optional(),
  key: z.string(),
  value: PossibleUserOptionValueSchema,
  user_can_edit: z.boolean().optional(),
  admin_only: z.boolean().optional()
});

export const ValidateOptionsUserOptionsSchema = z.record(
  z.string(),
  ValidateOptionsUserOptionSchema
);

export const ChannelSchema = z.object({
  channel_name: z.string(),
  id: z.number()
});

export const StandardEntityTypeSchema = z.union([
  z.literal('IP'),
  z.literal('IPv4'),
  z.literal('IPv4CIDR'),
  z.literal('IPv6'),
  z.literal('MAC'),
  z.literal('MD5'),
  z.literal('SHA1'),
  z.literal('SHA256'),
  z.literal('cve'),
  z.literal('domain'),
  z.literal('email'),
  z.literal('hash'),
  z.literal('string'),
  z.literal('url')
]);

export const EntityTypeSchema = z.union([
  StandardEntityTypeSchema,
  z.literal('*'),
  z.literal('custom'),
  z.custom<`custom.${string}`>((val) => /^custom\..+$/.test(val as string))
]);

export const EntitySchema = z.object({
  value: z.string(),
  types: z.array(EntityTypeSchema),
  type: EntityTypeSchema,
  requestContext: z.object({
    requestType: z.literal('onDemand'),
    isUserInitiated: z.boolean()
  }),
  longitude: z.number(),
  latitude: z.number(),
  isURL: z.boolean(),
  isSHA512: z.boolean(),
  isSHA256: z.boolean(),
  isSHA1: z.boolean(),
  isPrivateIP: z.boolean(),
  isMD5: z.boolean(),
  isIPv6: z.boolean(),
  isIPv4: z.boolean(),
  isIP: z.boolean(),
  isHex: z.boolean(),
  isHash: z.boolean(),
  isHTMLTag: z.boolean(),
  isEmail: z.boolean(),
  isDomain: z.boolean(),
  hashType: z.union([
    z.literal('md5'),
    z.literal('sha1'),
    z.literal('sha256'),
    z.literal('sha512'),
    z.literal('')
  ]),
  displayValue: z.string(),
  channels: z.array(ChannelSchema),
  IPType: z.union([z.literal('IPv4'), z.literal('IPv6'), z.literal('')])
});

export const ResultSchema = z.object({
  entity: EntitySchema,
  displayValue: z.string().optional(),
  data: z.object({
    summary: z.array(z.string()),
    details: z.unknown()
  })
});

export const DoLookupResultSchema = z.array(ResultSchema);

const SelectOptionItemSchema = z.object({
  value: z.string(),
  display: z.string()
});

// Schema for the 'options' array items (User Configuration)
const OptionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.enum(['text', 'password']),
    key: z.string(),
    name: z.string(),
    description: z.string().optional(),
    default: z.string().nullable(),
    userCanEdit: z.boolean().optional(),
    adminOnly: z.boolean().optional()
  }),
  z.object({
    type: z.literal('boolean'),
    key: z.string(),
    name: z.string(),
    description: z.string().optional(),
    default: z.boolean().nullable(),
    userCanEdit: z.boolean().optional(),
    adminOnly: z.boolean().optional()
  }),
  z.object({
    type: z.literal('number'),
    key: z.string(),
    name: z.string(),
    description: z.string().optional(),
    default: z.number().nullable(),
    userCanEdit: z.boolean().optional(),
    adminOnly: z.boolean().optional()
  }),
  z.object({
    type: z.literal('select'),
    key: z.string(),
    name: z.string(),
    description: z.string().optional(),
    // Default can be a single object or an array of objects depending on 'multiple'
    default: z
      .union([
        SelectOptionItemSchema,
        z.array(SelectOptionItemSchema),
        z.string() // Occasionally a simple string value is used for default
      ])
      .nullable(),
    options: z.array(SelectOptionItemSchema),
    multiple: z.boolean().optional(),
    userCanEdit: z.boolean(),
    adminOnly: z.boolean()
  })
]);
// Schema for custom data types defined within the config
const CustomTypeSchema = z.object({
  type: z.literal('custom').optional(), // Sometimes present in dataTypes
  name: z.string().optional(),
  description: z.string().optional(),
  key: z.string(),
  regex: z.string(),
  editable: z.boolean().optional(),
  enabled: z.boolean().optional()
});
// Component definition for block/summary
const ComponentPathSchema = z.object({
  file: z.string()
});
const ViewComponentSchema = z.object({
  component: ComponentPathSchema,
  template: ComponentPathSchema
});
export const IntegrationConfigSchema = z.object({
  polarityIntegrationUuid: z.uuid(),
  name: z.string(),
  acronym: z.string().max(10),
  description: z.string().optional(),
  defaultColor: z.string().optional(),
  // Entity and Data types
  entityTypes: z.array(z.string()).optional(),
  dataTypes: z.array(z.union([z.string(), CustomTypeSchema])).optional(),
  customTypes: z.array(CustomTypeSchema).optional(),
  supportsAdditionalCustomTypes: z.boolean().optional(),
  // UI/View Configuration
  styles: z.array(z.string()).optional(),
  block: ViewComponentSchema,
  summary: ViewComponentSchema.optional(),
  // Behavior Configuration
  onDemandOnly: z.boolean().optional(),
  copyOnDemand: z.boolean().optional(),
  // Logging and Networking
  logging: z
    .object({
      level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    })
    .optional(),
  request: z
    .object({
      cert: z.string().optional(),
      key: z.string().optional(),
      passphrase: z.string().optional(),
      ca: z.string().optional(),
      proxy: z.string().optional(),
      rejectUnauthorized: z.boolean().optional()
    })
    .optional(),
  // User Options
  options: z.array(OptionSchema).optional()
});
export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>;
