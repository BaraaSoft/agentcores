import { Injectable } from '@nestjs/common';
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { EmbeddingClient } from './embedding.client';
import { EMBEDDING_MODEL_ID } from './embedding.constants';

/**
 * Embeds text with a small model running in this process, so there is no API key and no network
 * call per embedding. The model is fetched once on first use and cached on disk by the
 * Hugging Face runtime, which is why the very first call is slow and later ones are not.
 */
@Injectable()
export class LocalEmbeddingClient extends EmbeddingClient {
  private extractor: Promise<FeatureExtractionPipeline> | null = null;

  /**
   * Returns the unit-length vector for `text`. Mean pooling turns the model's per-token output
   * into one vector for the whole text.
   */
  async embed(text: string): Promise<number[]> {
    const extract = await this.load();
    const output = await extract(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data as Float32Array);
  }

  /** Loads the model on first use and reuses it, so the download and warm-up happen once. */
  private load(): Promise<FeatureExtractionPipeline> {
    this.extractor ??= pipeline('feature-extraction', EMBEDDING_MODEL_ID);
    return this.extractor;
  }
}
