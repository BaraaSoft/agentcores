import { GENERAL_SKILL } from './general.skill';
import { TaskSkillBuilder } from './task-skill.builder';

const MAX_EXECUTION_STEPS = 150;

const STEPS = `
* The agent sees the screen the whole time and can work for a long session, up to ${MAX_EXECUTION_STEPS} screen actions.
  Give it the whole piece of design work as one step, not one change per step.
  "Open the design at canva.com/design/abc/edit. Make it a bold launch post for 'Now in beta': one large headline, a short
  subline, the logo in a corner, and a dark background with one bright accent colour. Save it, then report its link and
  how it looks in one sentence."
* The agent remembers nothing between steps. Each instruction must stand alone: the brief, where the design lives (its edit
  link once known), any text written out in full, the look to aim for, and how to tell it is done.
* Use the results so far, and the earlier Tasks' results. Always work on the design they name; never start a new one
  when one already exists.
* Never plan a step that only measures or re-checks positions, sizes, or colours. Judge the look, not the numbers.
* After a failed step, try a different way, not the same instruction again.
* A blocked step (a CAPTCHA, a code, a rate limit) is handled elsewhere. Never plan a step that tries to get past a gate.`;

const CRAFT = `
* Aim for work a good designer would be proud of, not the bare minimum of the brief: a clear hierarchy, one strong focal
  point, and deliberate type, colour, and spacing.
* A strong template or layout that fits the brief is a good start. Make it the owner's own; do not leave it generic.
* Ask the agent to step back and look at the whole design before it reports, and to fix what looks off.`;

/**
 * Visual design work in a design tool such as Canva or Figma. One long step does a whole piece of the
 * design, and the final screen comes back so Job review and the evaluator can see the work.
 */
export const CREATIVE_DESIGN_SKILL = new TaskSkillBuilder('creative_design')
  .from(GENERAL_SKILL)
  .withSection('STEPS', STEPS)
  .withSection('CRAFT', CRAFT)
  .withMaxExecutionSteps(MAX_EXECUTION_STEPS)
  .returnsScreenshot()
  .build();
