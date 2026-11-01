import type Anthropic from '@anthropic-ai/sdk';
import type { ToolUnion } from '@anthropic-ai/sdk/resources/messages';
import * as z from 'zod/v4';
import type { ReasoningProvider } from '../providers/reasoning-provider';
import { ReasoningToolError } from '../reasoning-tool.error';
import { ReasoningModelClient } from '../reasoning-model.client';
import type { ReasoningModelSettings } from '../types/reasoning-model-settings';
import type { ReasoningTool } from '../types/reasoning-tool';

const SCHEMA = z.object({ answer: z.string() });
const SETTINGS: ReasoningModelSettings = { providerName: 'anthropic', modelId: 'opus', effort: 'high' };
const SEARCH_TOOL = { type: 'web_search', name: 'web_search' } as unknown as ToolUnion;

/** A reasoning provider over a fake SDK that offers one search tool whenever the call asks for search. */
function fakeReasoningProvider(messages: Partial<Anthropic['messages']>): ReasoningProvider & { serverTools: jest.Mock } {
  return {
    sdk: { messages } as unknown as Anthropic,
    canFetch: false,
    serverTools: jest.fn((input) => (input.webSearch === undefined ? undefined : [SEARCH_TOOL])),
  };
}

const text = (value: string) => ({ type: 'text', text: value });
const reply = (stopReason: string, ...content: unknown[]) => ({ stop_reason: stopReason, content });
const ANSWERED = reply('end_turn', text('{"answer":"yes"}'));

function setup(first: ReturnType<typeof reply>) {
  const create = jest.fn().mockResolvedValue(first);
  const reasoningProvider = fakeReasoningProvider({ create } as unknown as Partial<Anthropic['messages']>);
  const client = new ReasoningModelClient(reasoningProvider, SETTINGS);
  const run = (webSearch?: { maxSearches: number }, webFetch?: { maxFetches: number }) =>
    client.completeStructured({
      systemPrompt: 'You decide.',
      userPrompt: 'Decide.',
      maxTokens: 4000,
      schema: SCHEMA,
      webSearch,
      webFetch,
    });
  return { create, reasoningProvider, client, run };
}

type Block = { type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: unknown };

const useTool = (id: string, name: string, input: unknown): Block => ({ type: 'tool_use', id, name, input });
const turn = (stopReason: string, ...content: Block[]) => ({ stop_reason: stopReason, content });

function setupLoop(...turns: ReturnType<typeof turn>[]) {
  const create = jest.fn();
  for (const each of turns) create.mockResolvedValueOnce(each);
  const added: string[] = [];
  const tools: ReasoningTool[] = [
    {
      name: 'add',
      description: 'Add an item.',
      inputSchema: z.object({ item: z.string() }),
      endsLoop: false,
      run: (input) => {
        const { item } = input as { item: string };
        if (item === 'bad') throw new ReasoningToolError('Not allowed.');
        added.push(item);
        return `Added ${item}.`;
      },
    },
    { name: 'finish', description: 'Stop.', inputSchema: z.object({}), endsLoop: true, run: () => 'Finished.' },
  ];
  const client = new ReasoningModelClient(fakeReasoningProvider({ create } as unknown as Partial<Anthropic['messages']>), SETTINGS);
  const run = (maxTurns = 5) =>
    client.runToolLoop({ systemPrompt: 'You plan.', userPrompt: 'Plan.', maxTokens: 4000, maxTurns, tools });
  const messages = () => create.mock.calls.at(-1)![0].messages;
  return { create, added, run, messages };
}

describe('ReasoningModelClient', () => {
  describe('completeStructured', () => {
    it('thinks adaptively and answers in the schema as a JSON output format', async () => {
      const t = setup(ANSWERED);

      expect(await t.run()).toEqual({ answer: 'yes' });

      const params = t.create.mock.calls[0][0];
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
        expect.objectContaining({
          type: 'json_schema',
          schema: expect.objectContaining({ properties: { answer: expect.anything() } }),
        }),
      );
    });

    it('reads the answer from the last text block, past any narration between searches', async () => {
      const t = setup(
        reply('end_turn', text('Searching the web first.'), { type: 'server_tool_use' }, text('{"answer":"found"}')),
      );

      expect(await t.run({ maxSearches: 3 })).toEqual({ answer: 'found' });
    });

    it('sends enum values as real schema constraints, not as description hints', async () => {
      const t = setup(reply('end_turn', text('{"verdict":"scored"}')));

      await t.client.completeStructured({
        systemPrompt: 'You judge.',
        userPrompt: 'Judge.',
        maxTokens: 4000,
        schema: z.object({ verdict: z.enum(['scored', 'needs_evidence']) }),
      });

      expect(t.create.mock.calls[0][0].output_config.format.schema.properties.verdict).toEqual({
        type: 'string',
        enum: ['scored', 'needs_evidence'],
      });
    });

    it('throws when the answer does not match the schema', async () => {
      const t = setup(reply('end_turn', text('{"answer":3}')));

      await expect(t.run()).rejects.toThrow();
    });

    it.each([
      ['cut off at max tokens', reply('max_tokens')],
      ['refused', reply('refusal')],
      ['empty', reply('end_turn')],
    ])('throws when the answer is %s', async (_label, first) => {
      const t = setup(first);

      await expect(t.run()).rejects.toThrow(`stop reason: ${first.stop_reason}`);
    });

    it('offers no server tools unless the call asks for one', async () => {
      const t = setup(ANSWERED);

      await t.run();

      expect(t.create.mock.calls[0][0].tools).toBeUndefined();
    });

    it('sends the server tools the reasoning provider builds for the call', async () => {
      const t = setup(ANSWERED);

      await t.run({ maxSearches: 3 }, { maxFetches: 2 });

      expect(t.reasoningProvider.serverTools).toHaveBeenCalledWith(
        expect.objectContaining({ webSearch: { maxSearches: 3 }, webFetch: { maxFetches: 2 } }),
      );
      expect(t.create.mock.calls[0][0].tools).toEqual([SEARCH_TOOL]);
    });

    it('carries on from its own work when a search pauses the turn', async () => {
      const t = setup(ANSWERED);
      const searching = [{ type: 'server_tool_use', name: 'web_search' }];
      t.create.mockResolvedValueOnce(reply('pause_turn', ...searching));

      expect(await t.run({ maxSearches: 3 })).toEqual({ answer: 'yes' });

      expect(t.create.mock.calls[1][0].messages).toEqual([
        { role: 'user', content: 'Decide.' },
        { role: 'assistant', content: searching },
      ]);
    });

    it('gives up on a turn that keeps pausing without answering', async () => {
      const t = setup(reply('pause_turn'));

      await expect(t.run({ maxSearches: 3 })).rejects.toThrow('paused more than');
    });
  });

  describe('runToolLoop', () => {
    it('runs tool calls, returns their results, and stops once the end tool succeeds', async () => {
      const t = setupLoop(turn('tool_use', useTool('1', 'add', { item: 'a' })), turn('tool_use', useTool('2', 'finish', {})));

      await t.run();

      expect(t.added).toEqual(['a']);
      expect(t.create).toHaveBeenCalledTimes(2);
      const params = t.create.mock.calls[0][0];
      expect(params).toEqual(
        expect.objectContaining({ model: 'opus', thinking: { type: 'adaptive' }, output_config: { effort: 'high' } }),
      );
      expect(params.tools[0]).toEqual(
        expect.objectContaining({ name: 'add', strict: true, input_schema: expect.objectContaining({ type: 'object' }) }),
      );
      expect(t.messages()[2]).toEqual({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: '1', content: 'Added a.', is_error: false }],
      });
    });

    it.each([
      ['a rejected call', useTool('1', 'add', { item: 'bad' }), 'Not allowed.'],
      ['invalid input', useTool('1', 'add', { item: 3 }), 'Invalid input'],
      ['an unknown tool', useTool('1', 'delete', {}), 'Unknown tool delete.'],
    ])('sends %s back as an error result and keeps going', async (_label, call, error) => {
      const t = setupLoop(turn('tool_use', call), turn('tool_use', useTool('2', 'finish', {})));

      await t.run();

      expect(t.added).toEqual([]);
      expect(t.messages()[2].content[0]).toEqual(
        expect.objectContaining({ is_error: true, content: expect.stringContaining(error) }),
      );
    });

    it('nudges the model when a turn has no tool call', async () => {
      const t = setupLoop(
        turn('end_turn', { type: 'text', text: 'Thinking aloud.' }),
        turn('tool_use', useTool('1', 'finish', {})),
      );

      await t.run();

      expect(t.messages()[2]).toEqual({ role: 'user', content: 'Continue by calling a tool. Call finish when you are done.' });
    });

    it('throws when the end tool is not called within maxTurns', async () => {
      const t = setupLoop(
        turn('tool_use', useTool('1', 'add', { item: 'a' })),
        turn('tool_use', useTool('2', 'add', { item: 'b' })),
      );

      await expect(t.run(2)).rejects.toThrow('did not call finish within 2 turns');
    });

    it('throws when a turn is cut off at max tokens', async () => {
      const t = setupLoop(turn('max_tokens'));

      await expect(t.run()).rejects.toThrow('stop reason: max_tokens');
    });
  });
});
