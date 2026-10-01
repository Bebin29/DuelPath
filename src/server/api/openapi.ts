/**
 * OpenAPI-Beschreibung der REST-API, damit Agenten sie ohne weitere Doku nutzen können.
 * Antworten stecken immer in `{ data }`, Fehler in `{ error: { code, message, details } }`.
 */

const json = (schema: object) => ({ content: { 'application/json': { schema } } });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const data = (schema: object) => json({ type: 'object', properties: { data: schema } });
const okResponse = (description: string, schema: object = { type: 'object' }) => ({
  description,
  ...data(schema),
});
const errors = {
  '400': { description: 'INVALID', ...json(ref('Error')) },
  '401': { description: 'UNAUTHORIZED', ...json(ref('Error')) },
  '404': { description: 'NOT_FOUND', ...json(ref('Error')) },
  '409': { description: 'CONFLICT: revision is stale, reload and retry', ...json(ref('Error')) },
  '422': { description: 'NOT_POSSIBLE: rules or board do not allow it', ...json(ref('Error')) },
  '429': { description: 'RATE_LIMITED (300 requests per minute)', ...json(ref('Error')) },
};
const path = (name: string, description: string) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string' },
});
const query = (name: string, description: string, type = 'string') => ({
  name,
  in: 'query',
  description,
  schema: { type },
});
const comboId = path('id', 'Combo id');
const stepId = path('stepId', 'Step id');
const stepQuery = query(
  'step',
  'Step id, or "start" for the start hand. Default: end of the main line.'
);

export const OPENAPI = {
  openapi: '3.1.0',
  info: {
    title: 'DuelPath API',
    version: '1',
    description: [
      'Build and analyse Yu-Gi-Oh! combos step by step. The server applies the rules engine of the',
      'workbench: every step returns the board after it, open questions (discard, search target,',
      'summoned monster, fusion materials), triggered effects and warnings.',
      '',
      'Typical agent loop:',
      '1. GET /decks, then POST /combos with deckId and startHand (card names or nicknames).',
      '2. POST /combos/{id}/steps with a command like "ns aluber", "act aluber 1", "ss albion",',
      '   "res" (resolve chain), "o ash" (opponent interrupts with Ash Blossom), "end".',
      '3. If the response lists prompts, answer them with POST /steps/{stepId}/answer and picks',
      '   from the candidates (instanceIds).',
      '4. Check state.warnings and triggers, continue until "end". Read /endboard and /stress.',
      '',
      'Writes accept an optional revision. If it does not match the stored one the call fails',
      'with 409 CONFLICT so you never overwrite edits made in the browser meanwhile.',
      'Authenticate with "Authorization: Bearer dp_..." (Settings > API tokens).',
    ].join('\n'),
  },
  servers: [{ url: '/api/v1' }],
  security: [{ bearer: [] }],
  components: {
    securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: {
                enum: [
                  'UNAUTHORIZED',
                  'NOT_FOUND',
                  'INVALID',
                  'CONFLICT',
                  'NOT_POSSIBLE',
                  'RATE_LIMITED',
                  'INTERNAL',
                ],
              },
              message: { type: 'string' },
              details: {},
            },
          },
        },
      },
      Card: {
        type: 'object',
        properties: {
          instanceId: { type: 'string', description: 'Identifies this copy in the combo' },
          cardId: { type: 'string' },
          name: { type: 'string' },
          zone: {
            enum: [
              'HAND',
              'MONSTER',
              'SPELL_TRAP',
              'FIELD',
              'GY',
              'BANISHED',
              'EXTRA',
              'DECK',
              'MATERIAL',
            ],
          },
          slot: { type: 'integer', description: 'Monster zones 0-4, 5 and 6 are the EMZ' },
          position: { enum: ['ATK', 'DEF', 'SET'] },
          owner: { enum: ['self', 'opponent'] },
          controller: { enum: ['self', 'opponent'] },
          attachedTo: { type: 'string', description: 'Xyz monster this material belongs to' },
        },
      },
      State: {
        type: 'object',
        properties: {
          stepId: { type: ['string', 'null'] },
          lp: { type: 'object' },
          normalSummonUsed: { type: 'boolean' },
          chain: { type: 'array', items: { type: 'object' } },
          self: {
            type: 'object',
            description: 'Cards per zone',
            additionalProperties: { type: 'array', items: ref('Card') },
          },
          opponent: { type: 'object', additionalProperties: { type: 'array', items: ref('Card') } },
          hoptUsed: { type: 'array', items: { type: 'string' } },
          warnings: { type: 'array', items: { type: 'object' } },
        },
      },
      Intent: {
        description: 'Exact action, as listed in GET /state?actions=1 or in triggers',
        oneOf: [
          {
            type: 'object',
            properties: {
              kind: { const: 'normalSummon' },
              instanceId: { type: 'string' },
              slot: { type: 'integer' },
            },
            required: ['kind', 'instanceId'],
          },
          {
            type: 'object',
            properties: { kind: { const: 'setMonster' }, instanceId: { type: 'string' } },
            required: ['kind', 'instanceId'],
          },
          {
            type: 'object',
            properties: {
              kind: { const: 'specialSummon' },
              instanceId: { type: 'string' },
              position: { enum: ['ATK', 'DEF', 'SET'] },
              materials: { type: 'array', items: { type: 'string' } },
            },
            required: ['kind', 'instanceId'],
          },
          {
            type: 'object',
            properties: {
              kind: { const: 'activate' },
              instanceId: { type: 'string' },
              effectIndex: { type: 'integer', description: '0-based' },
              chain: { type: 'boolean' },
            },
            required: ['kind', 'instanceId', 'effectIndex'],
          },
          {
            type: 'object',
            properties: { kind: { const: 'setSpellTrap' }, instanceId: { type: 'string' } },
            required: ['kind', 'instanceId'],
          },
          {
            type: 'object',
            properties: {
              kind: { const: 'move' },
              instanceId: { type: 'string' },
              to: {
                enum: ['HAND', 'DECK', 'EXTRA', 'MONSTER', 'SPELL_TRAP', 'FIELD', 'GY', 'BANISHED'],
              },
            },
            required: ['kind', 'instanceId', 'to'],
          },
          {
            type: 'object',
            properties: { kind: { const: 'changePosition' }, instanceId: { type: 'string' } },
            required: ['kind', 'instanceId'],
          },
          {
            type: 'object',
            properties: {
              kind: { const: 'token' },
              cardId: { type: 'string' },
              player: { enum: ['self', 'opponent'] },
            },
            required: ['kind', 'cardId', 'player'],
          },
          { type: 'object', properties: { kind: { const: 'resolve' } }, required: ['kind'] },
          { type: 'object', properties: { kind: { const: 'end' } }, required: ['kind'] },
        ],
      },
      StepRequest: {
        type: 'object',
        properties: {
          after: {
            type: ['string', 'null'],
            description:
              'Parent step id or "start". Default: end of the main line. A step that already has children starts a branch.',
          },
          command: {
            type: 'string',
            description:
              'ns, set, ss, act <card> [effect no.], gy, ban, hand, deck, pos, o <staple>, res, end. Cards by name, nickname or initials.',
          },
          intent: ref('Intent'),
          instanceId: { type: 'string', description: 'Disambiguates the card a command means' },
          materials: {
            type: 'array',
            items: { type: 'string' },
            description: 'instanceIds, needed for Extra Deck summons',
          },
          chain: {
            type: 'boolean',
            description: 'Chain onto the open chain instead of resolving it first',
          },
          slot: { type: 'integer' },
          target: { type: 'string', description: 'For "o <staple>": the instanceId it hits' },
          revision: { type: 'integer' },
        },
      },
      StepResult: {
        type: 'object',
        properties: {
          revision: { type: 'integer' },
          stepId: { type: 'string' },
          created: { type: 'array', items: { type: 'object' } },
          prompts: { type: 'array', items: ref('Prompt') },
          triggers: {
            type: 'array',
            items: {
              type: 'object',
              properties: { card: { type: 'string' }, intent: ref('Intent') },
            },
          },
          state: ref('State'),
          alternatives: {
            type: 'array',
            items: { type: 'object' },
            description: 'Other cards the command could have meant',
          },
        },
      },
      Prompt: {
        type: 'object',
        properties: {
          kind: { enum: ['discard', 'result', 'fusion'] },
          stepId: { type: 'string' },
          question: { type: 'string' },
          count: { type: 'integer' },
          candidates: { type: 'array', items: ref('Card') },
          materials: { type: 'object', description: 'Fusion only: candidate materials' },
        },
      },
    },
  },
  paths: {
    '/cards': {
      get: {
        summary: 'Search cards by name or nickname',
        parameters: [query('q', 'Search text'), query('limit', 'Max results (50)', 'integer')],
        responses: {
          '200': okResponse('Cards', { type: 'array', items: { type: 'object' } }),
          ...errors,
        },
      },
    },
    '/decks': {
      get: { summary: 'Own decks', responses: { '200': okResponse('Decks'), ...errors } },
    },
    '/decks/{id}': {
      get: {
        summary: 'Deck list by section',
        parameters: [path('id', 'Deck id')],
        responses: { '200': okResponse('Deck'), ...errors },
      },
    },
    '/combos': {
      get: { summary: 'Own combos', responses: { '200': okResponse('Combos'), ...errors } },
      post: {
        summary: 'Create a combo',
        requestBody: json({
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Default: suggested from the start hand' },
            deckId: { type: 'string' },
            startHand: {
              type: 'array',
              items: { type: 'string' },
              description: 'Card names, nicknames or passcodes from the Main Deck',
            },
            opponent: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  card: { type: 'string' },
                  zone: { enum: ['MONSTER', 'SPELL_TRAP', 'FIELD'] },
                },
              },
              description: 'Going second: opponent board',
            },
          },
        }),
        responses: { '201': okResponse('Combo'), ...errors },
      },
    },
    '/combos/{id}': {
      parameters: [comboId],
      get: {
        summary: 'Combo with start hand, main line and line ends',
        responses: { '200': okResponse('Combo'), ...errors },
      },
      patch: {
        summary: 'Title, tags, status, deck',
        requestBody: json({
          type: 'object',
          properties: {
            title: { type: 'string' },
            deckId: { type: ['string', 'null'] },
            tags: { type: 'array', items: { type: 'string' } },
            status: { enum: ['DRAFT', 'TESTED', 'TOURNAMENT'] },
            revision: { type: 'integer' },
          },
        }),
        responses: { '200': okResponse('Combo'), ...errors },
      },
      delete: {
        summary: 'Delete the combo',
        responses: { '200': okResponse('Deleted'), ...errors },
      },
    },
    '/combos/{id}/state': {
      parameters: [comboId],
      get: {
        summary: 'Board after a step',
        parameters: [
          stepQuery,
          query(
            'actions',
            '1: possible actions per own card outside the Deck, as intents; all: include the Deck'
          ),
        ],
        responses: { '200': okResponse('State', ref('State')), ...errors },
      },
    },
    '/combos/{id}/line': {
      parameters: [comboId],
      get: {
        summary: 'Numbered steps of the line through a step, with branches',
        parameters: [stepQuery],
        responses: { '200': okResponse('Line'), ...errors },
      },
    },
    '/combos/{id}/stress': {
      parameters: [comboId],
      get: {
        summary: 'Which staples stop the line and where',
        parameters: [stepQuery, query('pairs', '1: also test two staples together')],
        responses: {
          '200': okResponse('Hits, each with a ready "branch" step request'),
          ...errors,
        },
      },
    },
    '/combos/{id}/endboard': {
      parameters: [comboId],
      get: {
        summary: 'Endboard summary of the line',
        parameters: [stepQuery],
        responses: { '200': okResponse('Endboard'), ...errors },
      },
    },
    '/combos/{id}/steps': {
      parameters: [comboId],
      get: {
        summary: 'All steps of the tree',
        responses: { '200': okResponse('Steps'), ...errors },
      },
      post: {
        summary: 'Play the next step',
        requestBody: json(ref('StepRequest')),
        responses: { '201': okResponse('Step result', ref('StepResult')), ...errors },
      },
    },
    '/combos/{id}/steps/{stepId}': {
      parameters: [comboId, stepId],
      get: {
        summary: 'Step with path, open prompts, triggers and board',
        responses: { '200': okResponse('Step'), ...errors },
      },
      patch: {
        summary: 'Note, branch label, promote to main line',
        requestBody: json({
          type: 'object',
          properties: {
            note: { type: ['string', 'null'] },
            edgeLabel: { type: ['string', 'null'] },
            promote: { type: 'boolean' },
            revision: { type: 'integer' },
          },
        }),
        responses: { '200': okResponse('Step'), ...errors },
      },
      delete: {
        summary: 'Delete the step and everything after it',
        parameters: [query('revision', 'Expected revision', 'integer')],
        responses: { '200': okResponse('Deleted'), ...errors },
      },
    },
    '/combos/{id}/steps/{stepId}/answer': {
      parameters: [comboId, stepId],
      post: {
        summary: 'Answer an open prompt',
        requestBody: json({
          type: 'object',
          required: ['picks'],
          properties: {
            kind: {
              enum: ['discard', 'result', 'fusion'],
              description: 'Default: first open prompt',
            },
            picks: {
              type: 'array',
              items: { type: 'string' },
              description: 'instanceIds from the candidates (fusion: the materials)',
            },
            fusion: {
              type: 'string',
              description: 'Fusion only: instanceId of the Fusion Monster',
            },
            all: { type: 'boolean', description: 'Allow cards outside the detected filter' },
            revision: { type: 'integer' },
          },
        }),
        responses: { '200': okResponse('Remaining prompts and board'), ...errors },
      },
    },
  },
} as const;
