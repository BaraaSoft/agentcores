import { TASK_SKILL_TYPES } from '@ahe/agent-core';
import * as z from 'zod/v4';
import { ReasoningToolError } from '../../reasoning-tool.error';
import type { ReasoningTool } from '../../types/reasoning-tool';
import type { PlannedTask } from '../types/planned-task';

const position = (what: string) => z.number().int().describe(`1-based position of the Task ${what}, as shown by view_plan.`);
const action = z.string().describe('One concrete action with a clear end: what to do, where, and how to tell it is done.');
const skill = z.enum(TASK_SKILL_TYPES).describe('The kind of work the Task is; see TASK_SKILLS.');

function tool<TInput>(definition: ReasoningTool<TInput>): ReasoningTool<TInput> {
  return definition;
}

/**
 * The tools Job reasoning uses to edit a Job's remaining plan, over an in-memory draft. Nothing is
 * saved here: `planTasks` returns the draft and the Job processor writes it in one
 * `replaceRemainingTasks`, so a planning run that crashes halfway leaves the plan untouched.
 * The Task budget is guidance in the prompt, so a Job that genuinely needs more Tasks can plan them;
 * the draft refuses only what would pass the Job's hard limit (`maxTasks`, the room left under it).
 * One toolset per planning run; `ToolsetFactory` creates them.
 */
export class JobPlanningToolset {
  /** The tools to hand to Job reasoning. */
  readonly tools: readonly ReasoningTool[];
  private readonly draft: PlannedTask[];
  private finished = false;

  constructor(
    remainingTasks: readonly PlannedTask[],
    private readonly maxTasks: number,
  ) {
    this.draft = [...remainingTasks];
    this.tools = this.createTools();
  }

  /** The draft plan, in order. */
  get tasks(): readonly PlannedTask[] {
    return this.draft;
  }

  /** True once the model has called `finish_plan`. */
  get isFinished(): boolean {
    return this.finished;
  }

  private createTools(): readonly ReasoningTool[] {
    return [
      tool({
        name: 'view_plan',
        description: 'Show the draft plan with each Task’s position.',
        inputSchema: z.object({}),
        endsLoop: false,
        run: () => this.view(),
      }),
      tool({
        name: 'add_task',
        description: 'Insert a Task at a position, or append it when position is null.',
        inputSchema: z.object({
          action,
          skill,
          position: position('to insert before').nullable(),
        }),
        endsLoop: false,
        run: (input) => {
          if (this.draft.length >= this.maxTasks) throw new ReasoningToolError(this.fullMessage());
          const at = input.position === null ? this.draft.length : this.index(input.position, true);
          this.draft.splice(at, 0, { action: this.text(input.action), skillType: input.skill });
          return this.view();
        },
      }),
      tool({
        name: 'update_task',
        description: 'Rewrite the Task at a position, and its skill.',
        inputSchema: z.object({ position: position('to rewrite'), action, skill }),
        endsLoop: false,
        run: (input) => {
          this.draft[this.index(input.position)] = { action: this.text(input.action), skillType: input.skill };
          return this.view();
        },
      }),
      tool({
        name: 'remove_task',
        description: 'Drop the Task at a position from the plan.',
        inputSchema: z.object({ position: position('to drop') }),
        endsLoop: false,
        run: (input) => {
          this.draft.splice(this.index(input.position), 1);
          return this.view();
        },
      }),
      tool({
        name: 'move_task',
        description: 'Move the Task at one position to another.',
        inputSchema: z.object({
          from: position('to move'),
          to: position('to move it to'),
        }),
        endsLoop: false,
        run: (input) => {
          const from = this.index(input.from);
          const to = this.index(input.to);
          const [moved] = this.draft.splice(from, 1);
          this.draft.splice(to, 0, moved);
          return this.view();
        },
      }),
      tool({
        name: 'finish_plan',
        description: 'Save the draft as the Job’s plan and stop planning.',
        inputSchema: z.object({
          rationale: z.string().describe('Why this plan, in one sentence.'),
        }),
        endsLoop: true,
        run: () => {
          if (this.draft.length > this.maxTasks) {
            throw new ReasoningToolError(`${this.fullMessage()} Remove ${this.draft.length - this.maxTasks}.`);
          }
          this.finished = true;
          return `Plan saved with ${this.draft.length} Tasks.`;
        },
      }),
    ];
  }

  private fullMessage(): string {
    return (
      `The plan is full: the Job's hard limit leaves room for ${this.maxTasks} Tasks. ` +
      'Keep the Tasks that finish the objective and drop the rest.'
    );
  }

  private view(): string {
    if (this.draft.length === 0) return 'The plan is empty.';
    return this.draft.map((each, index) => `${index + 1}. [${each.skillType}] ${each.action}`).join('\n');
  }

  /** Array index of a 1-based position; `isInsert` also allows the slot after the last Task. */
  private index(oneBased: number, isInsert = false): number {
    const last = isInsert ? this.draft.length + 1 : this.draft.length;
    if (oneBased < 1 || oneBased > last) {
      throw new ReasoningToolError(`Position ${oneBased} is out of range; the plan has ${this.draft.length} Tasks.`);
    }
    return oneBased - 1;
  }

  private text(value: string): string {
    const trimmed = value.trim();
    if (trimmed === '') throw new ReasoningToolError('A Task needs an action.');
    return trimmed;
  }
}
