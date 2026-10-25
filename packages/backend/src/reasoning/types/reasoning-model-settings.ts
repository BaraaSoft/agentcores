/**
 * How one reasoning level calls the model. Each level can run a different model and effort.
 */
export interface ReasoningModelSettings {
  readonly modelId: string;
  /** How hard the model thinks before answering; higher is slower and costs more. */
  readonly effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}
