import * as z from 'zod/v4';

type JsonSchema = { [key: string]: unknown };

/** Limits the structured-output decoders cannot enforce; they would reject the schema with them in it. */
const UNSUPPORTED = new Set([
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minLength',
  'maxLength',
  'maxItems',
  'uniqueItems',
  'minProperties',
  'maxProperties',
]);

const SUPPORTED_FORMATS = new Set(['date-time', 'time', 'date', 'duration', 'email', 'hostname', 'uri', 'ipv4', 'ipv6', 'uuid']);

/** Keys whose value maps names to schemas, so the names themselves are never read as keywords. */
const SCHEMA_MAPS = new Set(['properties', '$defs', 'definitions']);

/**
 * zod writes a discriminated union as `oneOf`, which Claude rejects. Its branches each fix the
 * discriminator to a different `const`, so no answer matches two of them and `anyOf` means the same.
 */
const ONE_OF = 'oneOf';

/** The bounds zod adds to every `.int()`; they say nothing, so they are dropped rather than moved. */
const SAFE_INTEGER_BOUNDS = new Set([Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]);

function isUnsupported(key: string, value: unknown): boolean {
  if (key === 'minItems') return value !== 0 && value !== 1;
  if (key === 'format') return !SUPPORTED_FORMATS.has(value as string);
  return UNSUPPORTED.has(key);
}

function stripMap(map: JsonSchema): JsonSchema {
  return Object.fromEntries(Object.entries(map).map(([name, schema]) => [name, strip(schema)]));
}

function strip(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strip);
  if (node === null || typeof node !== 'object') return node;
  const kept: JsonSchema = {};
  const moved: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (SCHEMA_MAPS.has(key)) kept[key] = stripMap(value as JsonSchema);
    else if (key === ONE_OF) kept.anyOf = strip(value);
    else if (!isUnsupported(key, value)) kept[key] = strip(value);
    else if (!SAFE_INTEGER_BOUNDS.has(value as number)) moved.push(`${key}: ${JSON.stringify(value)}`);
  }
  if (moved.length === 0) return kept;
  const hint = `{${moved.join(', ')}}`;
  return { ...kept, description: typeof kept.description === 'string' ? `${kept.description}\n\n${hint}` : hint };
}

/**
 * The JSON schema a reasoning model's answer or tool input is constrained to, built from the zod schema
 * the client checks it against. It keeps `enum`, `const`, and union branches, which the decoders enforce, and moves the
 * limits they cannot enforce into the field's description as a hint. The SDK's `zodOutputFormat` is not
 * used: it also moves `enum` and `const` into descriptions, so no decoder enforces them.
 */
export function strictJsonSchema(schema: z.ZodType): JsonSchema {
  const { $schema: _draft, ...jsonSchema } = z.toJSONSchema(schema, { io: 'output' });
  return strip(jsonSchema) as JsonSchema;
}
