import { Draft, Draft07, JsonError, JsonSchema } from 'json-schema-library';

import { OptionRequirements, UserOption, UserOptions } from './types';
import generateOptionRequirementsSchema from './generateOptionRequirementsSchema';
import cp from 'copy-paste';

/**
 * This file is just a quick way of testing out a few scenarios for the
 * schema generation and will need to be translated to tests once out of
 * the POC stage.
 */
const runSchemaGeneration = (): void => {
  const userOptions: UserOptions = {
    apiUrl: {
      key: 'apiUrl',
      name: 'API URL',
      type: 'text',
      value: 'https://api.oort.io/',
      userCanEdit: false,
      adminOnly: true
    } as UserOption,
    username: {
      key: 'username',
      name: 'Username',
      type: 'text',
      value: '',
      userCanEdit: true,
      adminOnly: false
    } as UserOption,
    password: {
      key: 'password',
      name: 'Password',
      type: 'password',
      value: '',
      userCanEdit: true,
      adminOnly: false
    } as UserOption,
    apiKey: {
      key: 'apiKey',
      name: 'API Key',
      type: 'password',
      value: '',
      userCanEdit: true,
      adminOnly: false
    } as UserOption,
    queryType: {
      key: 'queryType',
      name: 'Query Type',
      value: { display: 'Threats & Endpoints', value: 'Threats & Endpoints' },
      type: 'select',
      options: [
        { display: 'Threats & Endpoints', value: 'Threats & Endpoints' },
        {
          display: 'Threats & Blocklists & Endpoints',
          value: 'Threats & Blocklists & Endpoints'
        },
        { display: 'Threats', value: 'Threats' },
        { display: 'Threats & Blocklists', value: 'Threats & Blocklists' },
        { display: 'Endpoints', value: 'Endpoints' }
      ],
      multiple: false,
      userCanEdit: false,
      adminOnly: false
    } as UserOption,
    threatFieldsToDisplay: {
      key: 'threatFieldsToDisplay',
      name: 'Threat Display Fields',
      value: [
        { display: 'Threat Details', value: 'Threat Details' },
        { display: 'Site', value: 'Site' },
        { display: 'Status', value: 'Status' }
      ],
      type: 'select',
      options: [
        { display: 'Threat Details', value: 'Threat Details' },
        { display: 'Status', value: 'Status' },
        { display: 'Policy', value: 'Policy' },
        { display: 'Found in Blocklist', value: 'Found in Blocklist' },
        { display: 'Blocklist Scope', value: 'Blocklist Scope' },
        { display: 'Endpoints', value: 'Endpoints' },
        { display: 'Reported Time', value: 'Reported Time' },
        { display: 'Detecting Engine', value: 'Detecting Engine' },
        { display: 'Accounts', value: 'Accounts' },
        { display: 'Site', value: 'Site' },
        { display: 'Group', value: 'Group' }
      ],
      multiple: true,
      userCanEdit: false,
      adminOnly: false
    } as UserOption,
    allowPolicyEdits: {
      key: 'allowPolicyEdits',
      name: 'Allow Policy Edits',
      value: false,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: false
    } as UserOption,
    maxConcurrent: {
      key: 'maxConcurrent',
      name: 'Max Concurrent Requests',
      value: 15,
      type: 'number',
      userCanEdit: false,
      adminOnly: true
    } as UserOption,
    minTime: {
      key: 'minTime',
      name: 'Minimum Time Between Lookups',
      value: 250,
      type: 'number',
      userCanEdit: false,
      adminOnly: true
    } as UserOption
  };

  const individualOptionsRequirements: OptionRequirements = [
    'apiUrl',
    { option: 'apiUrl', format: 'url', message: 'Invalid URL' },
    { option: 'apiUrl', pattern: '.*[^/]$', message: 'Url cannot end in /' },
    { option: 'apiKey', gt: 8, message: 'Key Must be longer than 8 characters' },

    'maxConcurrent',
    { option: 'minTime', gt: 0, message: 'Must be more than 0' },
    'queryType',
    {
      option: 'threatFieldsToDisplay',
      gte: 3,
      message: 'Must Display 3 or more fields'
    }
  ];
  const orOptionsRequirements: OptionRequirements = [
    {
      or: ['apiKey', { and: ['username', 'password'] }],
      message: 'Must provide either API Key or Username and Password'
    }
  ];
  const ifOptionsRequirements: OptionRequirements = [
    {
      if: 'allowPolicyEdits',
      then: {
        option: 'queryType',
        pattern: 'Blocklists',
        message: 'Must include `Blocklists` in Query Type when Allowing Policy Edits'
      }
    },
    {
      if: { option: 'threatFieldsToDisplay', pattern: '^Policy$' },
      then: {
        option: 'allowPolicyEdits',
        message: 'Must check if you wish to display `Policy`'
      }
    },
    {
      if: {
        or: [
          { option: 'queryType', pattern: 'Threats' },
          { option: 'queryType', pattern: 'Endpoints' }
        ]
      },
      then: {
        option: 'apiKey',
        message: 'Must provide API key when querying threats and/or endpoints'
      },
      else: {
        option: 'username',
        message: 'Must provide Username when querying blocklists'
      }
    },
    {
      if: {
        or: [
          { option: 'queryType', pattern: 'Threats' },
          { option: 'queryType', pattern: 'Endpoints' }
        ]
      },
      else: {
        option: 'password',
        message: 'Must provide Password when querying blocklists'
      }
    }
  ];

  const allOptionsRequirements: OptionRequirements = individualOptionsRequirements
    .concat(orOptionsRequirements)
    .concat(ifOptionsRequirements) as OptionRequirements;

  console.time('Schema Generation & Validation');
  const individualOptionsRequirementsSchema: JsonSchema =
    generateOptionRequirementsSchema(userOptions, individualOptionsRequirements);

  const individualOptionJsonSchemaErrors: JsonError[] = processSchema(
    userOptions,
    individualOptionsRequirementsSchema
  );

  const orOptionsRequirementsSchema: JsonSchema = generateOptionRequirementsSchema(
    userOptions,
    orOptionsRequirements
  );
  const orOptionJsonSchemaErrors: JsonError[] = processSchema(
    userOptions,
    orOptionsRequirementsSchema
  );

  const ifOptionsRequirementsSchema: JsonSchema = generateOptionRequirementsSchema(
    userOptions,
    ifOptionsRequirements
  );
  const ifOptionJsonSchemaErrors: JsonError[] = processSchema(
    userOptions,
    ifOptionsRequirementsSchema
  );

  const allOptionsRequirementsSchema: JsonSchema = generateOptionRequirementsSchema(
    userOptions,
    allOptionsRequirements
  );
  const allOptionJsonSchemaErrors: JsonError[] = processSchema(
    userOptions,
    allOptionsRequirementsSchema
  );
  console.timeEnd('Schema Generation & Validation');

  cp.copy(
    JSON.stringify(
      {
        userOptions,

        individualOptionsRequirements,
        individualOptionsRequirementsSchema,
        individualOptionJsonSchemaErrors,

        orOptionsRequirements,
        orOptionsRequirementsSchema,
        orOptionJsonSchemaErrors,

        ifOptionsRequirements,
        ifOptionsRequirementsSchema,
        ifOptionJsonSchemaErrors,

        allOptionsRequirements,
        allOptionsRequirementsSchema,
        allOptionJsonSchemaErrors
      },
      null,
      2
    )
  );
  console.log('\nJSON Schema Results have been copied to clipboard!\n\n');
};

const processSchema = (
  userOptions: UserOptions,
  generatedOptionRequirementsSchema: JsonSchema
): JsonError[] => {
  const jsonSchema: Draft = new Draft07(generatedOptionRequirementsSchema);
  const jsonSchemaErrors: JsonError[] = jsonSchema.validate(userOptions);

  return jsonSchemaErrors;
};

runSchemaGeneration();
