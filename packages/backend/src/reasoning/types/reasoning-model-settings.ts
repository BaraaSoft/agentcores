import type { ReasoningProviderName } from './reasoning-provider-name';

/**
 * How one reasoning level calls the model. Each level can run a different provider, model, and effort.
 */
export interface ReasoningModelSettings {
  readonly providerName: ReasoningProviderName;
  readonly modelId: string;
  /** How hard the model thinks before answering; higher is slower and costs more. */
  readonly effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}
