/**
 * Token ceiling for one `planUnitOfWork` call, thinking included. Research adds thinking, so it is generous,
 * but it must stay at or under 21,333: above that the SDK refuses a non-streaming call.
 */
export const PLAN_UNIT_OF_WORK_MAX_TOKENS = 20_000;

/** Web searches one Unit plan may make to learn the brief, the names in it, the tools, and the current standard. */
export const PLAN_UNIT_OF_WORK_MAX_SEARCHES = 5;

/** Web pages one Unit plan may read, such as a link the Strategy gives or a strong example a search found. */
export const PLAN_UNIT_OF_WORK_MAX_FETCHES = 3;

/** Most Jobs one Unit of Work may hold. */
export const MAX_JOBS_PER_UNIT_OF_WORK = 8;

/** Matches the width of `UnitOfWorkEntity.title`. */
export const UNIT_OF_WORK_TITLE_MAX_LENGTH = 200;

/** Matches the width of `JobEntity.name`. */
export const PLANNED_JOB_NAME_MAX_LENGTH = 200;
