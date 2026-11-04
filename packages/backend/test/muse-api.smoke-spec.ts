/**
 * Live smoke test of Meta's Model API: it sends every call shape the reasoning layer uses to both Muse models,
 * through the real provider. Run with `pnpm test:smoke`. It needs META_API_KEY in the environment or the root
 * `.env`, and skips itself without one, so CI runs it only where the key is a secret.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import * as z from 'zod/v4';
import { MuseReasoningProvider } from '../src/reasoning/providers/muse-reasoning.provider';
import { ReasoningModelClient } from '../src/reasoning/reasoning-model.client';

const ENV_FILE = resolve(__dirname, '../../../.env');
const fileEnv = existsSync(ENV_FILE) ? parseEnv(readFileSync(ENV_FILE, 'utf8')) : {};

const API_KEY = process.env.META_API_KEY || fileEnv.META_API_KEY || '';
const MODELS = ['muse-wonder-1.0', 'muse-spark-1.3'];
/** A 1x1 PNG, enough to prove an image block is accepted. */
const PIXEL_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const describeLive = API_KEY === '' ? describe.skip : describe;

describeLive('Meta Model API (api.meta.ai)', () => {
  const provider = MuseReasoningProvider.create(API_KEY);

  it('lists both Muse models', async () => {
    const ids: string[] = [];
    for await (const model of provider.sdk.models.list()) ids.push(model.id);
    expect(ids).toEqual(expect.arrayContaining(MODELS));
  });

  describe.each(MODELS)('%s', (modelId) => {
    const client = new ReasoningModelClient(provider, { providerName: 'muse', modelId, effort: 'medium' });

    it('returns a structured answer after a web search, with an image attached', async () => {
      const answer = await client.completeStructured({
        systemPrompt: 'You answer in the given shape.',
        userPrompt: 'Search the web once for the latest Muse Spark release, then describe the attached image in a few words.',
        maxTokens: 4000,
        schema: z.object({ release: z.string(), image: z.string() }),
        images: [{ mediaType: 'image/png', base64: PIXEL_PNG }],
        webSearch: { maxSearches: 1 },
      });

      expect(answer.release).not.toBe('');
      expect(answer.image).not.toBe('');
    });

    it('calls tools in a strict loop until a tool ends it', async () => {
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

      expect(added).toEqual(['first']);
    });
  });
});
