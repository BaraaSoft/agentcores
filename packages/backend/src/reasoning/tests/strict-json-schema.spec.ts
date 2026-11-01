import * as z from 'zod/v4';
import { strictJsonSchema } from '../strict-json-schema';

describe('strictJsonSchema', () => {
  it('keeps enum and const, so the decoder enforces them', () => {
    const schema = strictJsonSchema(
      z.object({ verdict: z.enum(['scored', 'needs_evidence']).describe('The verdict.'), kind: z.literal('job') }),
    );

    expect(schema).not.toHaveProperty('$schema');
    expect(schema).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['verdict', 'kind'],
      properties: {
        verdict: { type: 'string', enum: ['scored', 'needs_evidence'], description: 'The verdict.' },
        kind: { type: 'string', const: 'job' },
      },
    });
  });

  it('moves limits the decoder cannot enforce into the description, and keeps the zod check for them', () => {
    const schema = strictJsonSchema(
      z.object({
        score: z.number().min(1).max(10).describe('The mark.'),
        name: z.string().max(40),
        tags: z.array(z.string()).min(1).max(5),
      }),
    );

    expect(schema.properties).toEqual({
      score: { type: 'number', description: 'The mark.\n\n{minimum: 1, maximum: 10}' },
      name: { type: 'string', description: '{maxLength: 40}' },
      tags: { type: 'array', items: { type: 'string' }, minItems: 1, description: '{maxItems: 5}' },
    });
  });

  it('drops the safe-integer bounds zod adds to every int', () => {
    const schema = strictJsonSchema(z.object({ position: z.number().int().describe('1-based position.') }));

    expect(schema.properties).toEqual({ position: { type: 'integer', description: '1-based position.' } });
  });

  it('writes a discriminated union as anyOf, which both decoders take', () => {
    const schema = strictJsonSchema(
      z.discriminatedUnion('kind', [z.object({ kind: z.literal('a'), a: z.string() }), z.object({ kind: z.literal('b') })]),
    );

    expect(schema).not.toHaveProperty('oneOf');
    expect(schema.anyOf).toEqual([
      expect.objectContaining({ properties: { kind: { type: 'string', const: 'a' }, a: { type: 'string' } }, required: ['kind', 'a'] }),
      expect.objectContaining({ properties: { kind: { type: 'string', const: 'b' } }, required: ['kind'] }),
    ]);
  });

  it('never reads a property name as a keyword', () => {
    const schema = strictJsonSchema(z.object({ maximum: z.string() }));

    expect(schema.properties).toEqual({ maximum: { type: 'string' } });
  });

  it('cleans nested and nullable schemas too', () => {
    const schema = strictJsonSchema(
      z.object({ items: z.array(z.object({ count: z.number().int().max(3) })).nullable() }),
    );

    expect(JSON.stringify(schema)).not.toContain('"maximum"');
    expect(JSON.stringify(schema)).toContain('{maximum: 3}');
    expect(JSON.stringify(schema)).toContain('"additionalProperties":false');
  });
});
