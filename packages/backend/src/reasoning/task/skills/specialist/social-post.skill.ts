import { GENERAL_SKILL } from './general.skill';
import { TaskSkillBuilder } from '../builder/task-skill.builder';

const CRAFT = `
* Write the full text of every post or reply into the instruction, in the owner's voice. Never let the agent improvise
  what to publish.
* Write like a person, not like an AI. Never use an em dash (—) in a post or a reply; use a comma, a colon, or a
  full stop instead.
* Write for the people who will read it: lead with what is useful or interesting to them, not with what the owner wants.
* Fit the place. Before the first post in a community, have the agent read its rules and a few recent posts, then match
  its tone, length, and format, and respect what it allows (links, self-promotion, media).
* Be a real participant: answer the people who respond, never post the same text twice, and never post in bulk.
* Ask the agent to report the link of what it published, and the response numbers it can see on it.`;

/**
 * Posting, replying, and reading responses on any social platform or online community.
 */
export const SOCIAL_POST_SKILL = new TaskSkillBuilder('social_post').from(GENERAL_SKILL).withSection('CRAFT', CRAFT).build();
