import type { TaskSkillType } from '@ahe/agent-core';
import { DEFAULT_MAX_EXECUTION_STEPS, REQUIRED_TASK_SKILL_SECTIONS } from './task-skill.constants';
import type { TaskSkill } from './task-skill';
import type { TaskSkillSection } from './task-skill-sections';

/**
 * Builds a `TaskSkill`. A skill usually starts `.from(GENERAL_SKILL)` and replaces or adds only the
 * sections that differ; a section can never be removed. `build()` checks the skill and freezes it.
 */
export class TaskSkillBuilder {
  private sections: Partial<Record<TaskSkillSection, string>> = {};
  private maxExecutionSteps = DEFAULT_MAX_EXECUTION_STEPS;
  private isReturningScreenshot = false;

  constructor(private readonly skillType: TaskSkillType) {}

  /** Starts from a copy of `base`: its sections, step limit, and screenshot setting. */
  from(base: TaskSkill): this {
    this.sections = { ...base.systemPrompt };
    this.maxExecutionSteps = base.maxExecutionSteps;
    this.isReturningScreenshot = base.returnsScreenshot;
    return this;
  }

  /** Sets one section of the system prompt, replacing it when it is already set. */
  withSection(section: TaskSkillSection, text: string): this {
    const trimmed = text.trim();
    if (trimmed === '') throw new Error(`Skill "${this.skillType}": section ${section} is empty`);
    this.sections[section] = trimmed;
    return this;
  }

  /** Sets how many screen actions one execution step may take. */
  withMaxExecutionSteps(maxSteps: number): this {
    this.maxExecutionSteps = maxSteps;
    return this;
  }

  /** Makes every step return the final screen as a screenshot. */
  returnsScreenshot(): this {
    this.isReturningScreenshot = true;
    return this;
  }

  /** Checks the skill and returns it frozen. Throws on a missing required section or a step limit below 1. */
  build(): TaskSkill {
    const missing = REQUIRED_TASK_SKILL_SECTIONS.filter((section) => this.sections[section] === undefined);
    if (missing.length > 0) throw new Error(`Skill "${this.skillType}" is missing sections: ${missing.join(', ')}`);
    if (!Number.isInteger(this.maxExecutionSteps) || this.maxExecutionSteps < 1) {
      throw new Error(`Skill "${this.skillType}": maxExecutionSteps must be a whole number of at least 1`);
    }
    return Object.freeze({
      skillType: this.skillType,
      systemPrompt: Object.freeze({ ...this.sections }),
      maxExecutionSteps: this.maxExecutionSteps,
      returnsScreenshot: this.isReturningScreenshot,
    });
  }
}
