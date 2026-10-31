import { GENERAL_SKILL } from './general.skill';
import { TaskSkillBuilder } from './task-skill.builder';

const MAX_EXECUTION_STEPS = 150;

const STEPS = `
* The agent sees the screen the whole time and can work for a long session, up to ${MAX_EXECUTION_STEPS} screen actions.
  Give it a whole piece of the design work as one step: make the piece, or refine it. Never one change per step.
* The agent remembers nothing between steps, so every design instruction stands alone. Build it from these parts:
  - The piece: what it is, what it is for, who will see it, and the format and size it must work at.
  - Where it lives: the tool to use, and the file or edit link once an earlier result reported one.
  - The content: every word of text written out in full, and every asset to use and where to find it.
  - The direction: the one idea the piece must express, and the qualities from CRAFT that matter most for it.
  - For a refinement: what to keep from the current version, and exactly what to change.
  - The finish line: the work saved, then a report of where it lives and one sentence on how it looks.
* Use the results so far, and the earlier Tasks' results. Always work on the piece they name; never start a new one
  when one already exists.
* Never plan a step that only measures or re-checks positions, sizes, or colours. Judge the look, not the numbers.
* After a failed step, try a different way, not the same instruction again.
* A blocked step (a CAPTCHA, a code, a rate limit) is handled elsewhere. Never plan a step that tries to get past a gate.`;

const CRAFT = `
* Aim for the work a skilled designer would make for this purpose, not the bare minimum of the brief.
* Start from the purpose. Decide what the viewer must understand or feel, and let every choice serve that.
* One idea and one focal point. The eye lands on the most important element first and knows where to go next.
* Hierarchy and contrast: make what matters clearly bigger, bolder, or stronger. Differences are deliberate, never slight.
* Restraint: few typefaces, a small palette, and nothing that does not earn its place. Give elements room to breathe.
* Order: align elements to a shared structure, and repeat sizes, spacing, and colours on purpose.
* Fit the medium: the piece must work at the size and in the place it is seen, from a small mark to a large layout.
* Make it distinctive. A template or a starting layout is fine, but the result must not look like a default.
* Follow the brand, voice, and limits in the owner context whenever it gives them.
* Before it reports, the agent looks at the whole piece at its real viewing size, judges it against the purpose,
  and fixes what is weak.`;

/**
 * Visual design work in any design tool or editor. One long step does a whole piece of the design, and
 * the final screen comes back so Job review and the evaluator can see the work.
 */
export const CREATIVE_DESIGN_SKILL = new TaskSkillBuilder('creative_design')
  .from(GENERAL_SKILL)
  .withSection('STEPS', STEPS)
  .withSection('CRAFT', CRAFT)
  .withMaxExecutionSteps(MAX_EXECUTION_STEPS)
  .returnsScreenshot()
  .build();
