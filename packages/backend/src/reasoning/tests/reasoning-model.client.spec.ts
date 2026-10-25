import type Anthropic from '@anthropic-ai/sdk';
import * as z from 'zod/v4';
import { ReasoningModelClient } from '../reasoning-model.client';

const SCHEMA = z.object({ answer: z.string() });

function setup(reply: { stop_reason: string; parsed_output: unknown }) {
  const parse = jest.fn().mockResolvedValue(reply);
  const client = new ReasoningModelClient({ messages: { parse } } as unknown as Anthropic, { modelId: 'opus', effort: 'high' });
  const run = () => client.completeStructured({ systemPrompt: 'You decide.', userPrompt: 'Decide.', maxTokens: 4000, schema: SCHEMA });
  return { parse, run };
}

describe('ReasoningModelClient', () => {
  it('thinks adaptively and answers in the schema as a JSON output format', async () => {
    const t = setup({ stop_reason: 'end_turn', parsed_output: { answer: 'yes' } });

    expect(await t.run()).toEqual({ answer: 'yes' });

    const params = t.parse.mock.calls[0][0];
    expect(params).toEqual(
      expect.objectContaining({
        model: 'opus',
        max_tokens: 4000,
        system: 'You decide.',
        messages: [{ role: 'user', content: 'Decide.' }],
        thinking: { type: 'adaptive' },
      }),
    );
    expect(params.output_config.effort).toBe('high');
    expect(params.output_config.format).toEqual(
      expect.objectContaining({ type: 'json_schema', schema: expect.objectContaining({ properties: { answer: expect.anything() } }) }),
    );
  });

  it.each([
    ['cut off at max tokens', { stop_reason: 'max_tokens', parsed_output: null }],
    ['refused', { stop_reason: 'refusal', parsed_output: null }],
  ])('throws when the answer is %s', async (_label, reply) => {
    const t = setup(reply);

    await expect(t.run()).rejects.toThrow(`stop reason: ${reply.stop_reason}`);
  });
});
