import { GENERAL_SKILL } from './general.skill';
import { TaskSkillBuilder } from './task-skill.builder';

const CRAFT = `
* Write the full text of every post or reply into the instruction, in the owner's voice. Never let the agent improvise
  what to publish.
* Before the first post in a community, have the agent read its rules and a few recent posts, and fit in: tone, length,
  and whether links are allowed.
* Ask the agent to report the permalink of what it published, and the visible numbers on it (likes, replies, upvotes).`;

/**
 * Posting, replying, and reading responses on a social platform such as Reddit or X.
 */
export const SOCIAL_POST_SKILL = new TaskSkillBuilder('social_post').from(GENERAL_SKILL).withSection('CRAFT', CRAFT).build();
