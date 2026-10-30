import { JOB_EVALUATION_STATES } from '@ahe/agent-core';
import type { JobEvaluationState } from '@ahe/agent-core';
import { ApiProperty } from '@nestjs/swagger';
import type { JobEvaluationEntity } from '../../../../governance/entities/job-evaluation.entity';

/**
 * The evaluation of one Job. The score and the feedback stay empty until the state is `scored`.
 */
export class JobEvaluationResponseDto {
  @ApiProperty({ enum: JOB_EVALUATION_STATES })
  state: JobEvaluationState;

  @ApiProperty({ type: Number, nullable: true, minimum: 1, maximum: 10 })
  score: number | null;

  @ApiProperty({ description: 'What worked and is worth repeating' })
  whatGood: string;

  @ApiProperty({ description: 'What went wrong and should not be repeated' })
  whatBad: string;

  @ApiProperty({ description: 'The standard the Job was held to, or why it was not evaluated' })
  rubric: string;

  static fromEntity(entity: JobEvaluationEntity): JobEvaluationResponseDto {
    return Object.assign(new JobEvaluationResponseDto(), {
      state: entity.state,
      score: entity.score,
      whatGood: entity.whatGood,
      whatBad: entity.whatBad,
      rubric: entity.rubric,
    });
  }
}
