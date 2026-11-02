import type Anthropic from '@anthropic-ai/sdk';
import { MuseConversation } from '../muse-conversation';

const screenshot = (id: string): Anthropic.Messages.ToolResultBlockParam => ({
  type: 'tool_result',
  tool_use_id: id,
  content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: id } }],
});

/** The image data still in the conversation, oldest first. */
const keptImages = (conversation: MuseConversation): string[] =>
  conversation.messages.flatMap((message) =>
    typeof message.content === 'string'
      ? []
      : message.content.flatMap((block) =>
          block.type === 'tool_result' && Array.isArray(block.content)
            ? block.content.flatMap((part) => (part.type === 'image' && part.source.type === 'base64' ? [part.source.data] : []))
            : [],
        ),
  );

describe('MuseConversation', () => {
  it('starts with the task prompt', () => {
    expect(new MuseConversation('Do it.', 3).messages).toEqual([{ role: 'user', content: 'Do it.' }]);
  });

  it('keeps only the newest screenshots, oldest dropped first', () => {
    const conversation = new MuseConversation('Do it.', 2);
    conversation.addToolResults([screenshot('s1')]);
    conversation.addToolResults([screenshot('s2'), screenshot('s3')]);
    conversation.addToolResults([screenshot('s4')]);

    expect(keptImages(conversation)).toEqual(['s3', 's4']);
    expect(JSON.stringify(conversation.messages)).toContain('An earlier screenshot, removed to save space.');
  });

  it('adds the model turn and text messages in order', () => {
    const conversation = new MuseConversation('Do it.', 3);
    conversation.addModelTurn([{ type: 'text', text: 'Looking.', citations: null }]);
    conversation.addUserText('Call a tool.');

    expect(conversation.messages.map((message) => message.role)).toEqual(['user', 'assistant', 'user']);
  });
});
