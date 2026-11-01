/**
 * Live check that Meta's Messages API accepts every call shape reasoning sends: a structured answer with
 * web search and an image, and a strict tool loop. Run with `pnpm muse:smoke`; needs META_API_KEY in the root `.env`.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as z from 'zod/v4';
import { MuseReasoningProvider } from '../src/reasoning/providers/muse-reasoning.provider';
import { ReasoningModelClient } from '../src/reasoning/reasoning-model.client';

const ENV_FILE = resolve(__dirname, '../../../.env');
const MODELS = ['muse-wonder-1.0', 'muse-spark-1.3'];
/** A 1x1 PNG, enough to prove an image block is accepted. */
const PIXEL_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function structured(client: ReasoningModelClient): Promise<unknown> {
  return client.completeStructured({
    systemPrompt: 'You answer in the given shape.',
    userPrompt: 'Search the web once for the latest Muse Spark release, then describe the attached image in a few words.',
    maxTokens: 4000,
    schema: z.object({ release: z.string(), image: z.string() }),
    images: [{ mediaType: 'image/png', base64: PIXEL_PNG }],
    webSearch: { maxSearches: 1 },
    webFetch: { maxFetches: 1 },
  });
}

async function toolLoop(client: ReasoningModelClient): Promise<string[]> {
  const added: string[] = [];
  await client.runToolLoop({
    systemPrompt: 'You plan with tools.',
    userPrompt: 'Add the item "first", then call finish.',
    maxTokens: 4000,
    maxTurns: 4,
    tools: [
      {
        name: 'add',
        description: 'Add one item.',
        inputSchema: z.object({ item: z.string() }),
        endsLoop: false,
        run: (input) => {
          added.push((input as { item: string }).item);
          return 'Added.';
        },
      },
      { name: 'finish', description: 'Stop.', inputSchema: z.object({}), endsLoop: true, run: () => 'Finished.' },
    ],
  });
  return added;
}

async function main(): Promise<void> {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  const apiKey = process.env.META_API_KEY;
  if (!apiKey) throw new Error('META_API_KEY is not set');
  const reasoningProvider = MuseReasoningProvider.create(apiKey);
  for (const modelId of MODELS) {
    const client = new ReasoningModelClient(reasoningProvider, { providerName: 'muse', modelId, effort: 'medium' });
    console.log(`${modelId} structured:`, await structured(client));
    console.log(`${modelId} tool loop:`, await toolLoop(client));
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
