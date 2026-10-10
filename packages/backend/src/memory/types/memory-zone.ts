/**
 * Privacy zone of a memory record.
 * - `open`: philosophy, voice, the experience of HumanExperiences — safe for the agent.
 * - `sealed`: personal story, internal architecture, anything unpublished — never loaded.
 * Records with a missing or unknown zone are treated as `sealed` (fail closed).
 */
export type MemoryZone = 'open' | 'sealed';
