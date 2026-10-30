/** Token ceiling for one `planUnitOfWork` call, thinking included. */
export const PLAN_UNIT_MAX_TOKENS = 16_000;

/** Most Jobs one Unit of Work may hold. */
export const MAX_JOBS_PER_UNIT = 8;

/** Matches the width of `JobEntity.name`. */
export const PLANNED_JOB_NAME_MAX_LENGTH = 200;
