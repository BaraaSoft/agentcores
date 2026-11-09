import type { ToolCall } from '@agentcores/agent-core';
import type { BetaToolUseBlock } from '@anthropic-ai/sdk/resources/beta';
import { ActionExecutor } from '../../actions/action-executor';
import type { ActionGuard } from '../../actions/action-guard';
import { PermissiveActionGuard } from '../../actions/permissive-action-guard';
import { DisplayGeometry } from '../../geometry/display-geometry';
import { FakeDesktopDriver } from '../../driver/testing/fake-desktop-driver';
import { AnthropicComputerToolset } from '../anthropic-computer-toolset';

const toolUse = (name: string, input: Record<string, unknown> = {}): BetaToolUseBlock => ({
  type: 'tool_use',
  id: `toolu_${name}`,
  name,
  input,
  toolset_name: 'computer',
});

describe('AnthropicComputerToolset', () => {
  let desktop: FakeDesktopDriver;
  let toolset: AnthropicComputerToolset;

  const createToolset = (guard: ActionGuard = new PermissiveActionGuard()): AnthropicComputerToolset => {
    const geometry = DisplayGeometry.fit({ width: 1440, height: 900 }, { width: 1280, height: 800 });
    return new AnthropicComputerToolset(new ActionExecutor(desktop, geometry, 0), guard, false);
  };

  beforeEach(() => {
    desktop = new FakeDesktopDriver();
    toolset = createToolset();
  });

  afterEach(async () => {
    await toolset.close();
  });

  it('declares the toolset with triple-click turned off for a two-click pointer', () => {
    const entry = toolset.toJSON();
    expect(entry.type).toBe('computer_toolset_20260801');
    expect(entry.configs?.triple_click?.enabled).toBe(false);
    expect(entry.configs?.left_click?.enabled).not.toBe(false);
  });

  it('answers a screenshot with one image block', async () => {
    const result = await toolset.toolResult(toolUse('screenshot'));
    expect(result.is_error).toBeFalsy();
    expect(JSON.stringify(result.content)).toContain('"type":"image"');
    expect(desktop.calls).toEqual(['capture', 'resize 1280x800']);
  });

  it('routes a click through the executor in display pixels', async () => {
    const result = await toolset.toolResult(toolUse('left_click', { coordinate: [640, 400] }));
    expect(result.is_error).toBeFalsy();
    expect(desktop.calls).toEqual(['moveTo 720,450', 'click left x1']);
  });

  it('shows the model why a call was refused', async () => {
    const result = await toolset.toolResult(toolUse('left_click', { coordinate: [5000, 5] }));
    expect(result.is_error).toBe(true);
    expect(JSON.stringify(result.content)).toContain('outside the 1280x800 screenshot');
    expect(desktop.calls).toEqual([]);
  });

  it('asks the guard before typing, and skips the call when it declines', async () => {
    const seen: ToolCall[] = [];
    await toolset.close();
    toolset = createToolset({
      allows: async (toolCall) => {
        seen.push(toolCall);
        return toolCall.kind !== 'type';
      },
    });

    const result = await toolset.toolResult(toolUse('type', { text: 'hello' }));
    expect(result.is_error).toBe(true);
    expect(seen).toEqual([{ kind: 'type', text: 'hello' }]);
    expect(desktop.calls).toEqual([]);
  });

  it('hides desktop error details from the model', async () => {
    desktop.screen.capture = async () => {
      throw new Error('screencapture failed writing /private/var/folders/secret.png');
    };
    const result = await toolset.toolResult(toolUse('screenshot'));
    expect(result.is_error).toBe(true);
    expect(JSON.stringify(result.content)).not.toContain('/private/var');
  });
});
