import { GENERAL_SKILL } from './general.skill';
import { TaskSkillBuilder } from '../builder/task-skill.builder';

const MAX_EXECUTION_STEPS = 150;

const STEPS = `
* The agent sees the screen the whole time and can work for a long session, up to ${MAX_EXECUTION_STEPS} screen actions.
  Give it the whole piece, with its review and its round of fixes, as one step. Never one change per step.
* Plan another step only when the result reports the piece unfinished, broken, or unsaved. A finished piece that
  reported how it looks is done.
* The agent remembers nothing between steps, so every design instruction stands alone. Build it from these parts:
  - The piece: what it is, what it is for, who will see it, and the format and size it must work at.
  - Where it lives: the tool to use, and the file or edit link once an earlier result reported one.
  - The content: every word of text written out in full, and every asset to use and where to find it.
  - The direction: the one idea the piece must express, and the qualities from CRAFT that matter most for it.
    Write qualities, never measurements such as sizes, positions, or percentages, unless the brief fixes them.
  - For a refinement: what to keep from the current version, and the quality the change must reach. When the piece
    lacks an idea, ask for a new concept or composition, not bigger or smaller parts.
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
* The style the brief or the owner context names always wins. When neither names one, aim for modern, creative,
  and elegant work:
  - Modern: current type and layout, confident scale, and nothing that looks like a stock template.
  - Creative, the most important of the three: build the piece around one original, unexpected idea that makes it
    memorable, such as a bold crop, a striking type treatment, a visual metaphor, or an unusual composition. Ask
    what the obvious version of the piece is, then go past it. A viewer must stop and look twice.
  - Elegant: great use of colour, space, and typography. Choose a harmonious palette with a clear accent and 
    deliberate use of space, and pair refined typefaces with clear weights and sizes. Take care in
    every detail.
* Every element earns its place, whether the piece is quiet or bold.
* Order: align elements to a shared structure, and repeat sizes, spacing, and colours on purpose.
* Fit the medium: the piece must work at the size and in the place it is seen, from a small mark to a large layout.
* Make it distinctive. A template or a starting layout is fine, but the result must not look like a default.
* Follow the brand, voice, and limits in the owner context whenever it gives them.
* Before it reports, the agent looks at the whole piece at its real viewing size, judges it against the purpose,
  and fixes what is weak in one round.`;

const PACING = `
* Design work is slow on a screen, so put the way to work into every design instruction:
  - Work by eye, as a designer does. Use the tool's own layout controls, such as align, distribute, snap, styles, and
    presets, before typing exact values. Type a value only when the brief needs that exact value.
  - Settle the big decisions first: format, layout, type, and colour. Then the details. Never polish one element while
    the whole piece is still unsettled.
  - When the piece is built: one review of the whole, one round of fixes for what the review found, then save and
    report. No second round of small adjustments.
* A refinement changes only what it names. It does not rebuild or re-measure the rest.
* Never repeat an action that just triggered a check. Confirm what is already saved before you try it again.`;

/**
 * Visual design work in any design tool or editor. One long step does a whole piece of the design, and
 * the final screen comes back so Job review and the evaluator can see the work.
 */
export const CREATIVE_DESIGN_SKILL = new TaskSkillBuilder('creative_design')
  .from(GENERAL_SKILL)
  .withSection('STEPS', STEPS)
  .withSection('CRAFT', CRAFT)
  .withSection('PACING', PACING)
  .withMaxExecutionSteps(MAX_EXECUTION_STEPS)
  .returnsScreenshot()
  .build();
