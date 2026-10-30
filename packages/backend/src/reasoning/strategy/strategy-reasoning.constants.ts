/** Token ceiling for one `planUnitOfWork` call, thinking included. */
export const PLAN_UNIT_OF_WORK_MAX_TOKENS = 16_000;

/** Most Jobs one Unit of Work may hold. */
export const MAX_JOBS_PER_UNIT_OF_WORK = 8;

/** Matches the width of `UnitOfWorkEntity.title`. */
export const UNIT_OF_WORK_TITLE_MAX_LENGTH = 200;

/** Matches the width of `JobEntity.name`. */
export const PLANNED_JOB_NAME_MAX_LENGTH = 200;
