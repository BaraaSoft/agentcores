import { Module } from '@nestjs/common';
import { EmbeddingClient } from './embedding.client';
import { LocalEmbeddingClient } from './local-embedding.client';

/**
 * Text embeddings for similarity search. Callers depend on `EmbeddingClient`, so moving to a
 * hosted model later is one new implementation and a rebuild of the stored vectors.
 * A leaf module: other modules call it, it calls no one.
 */
@Module({
  providers: [{ provide: EmbeddingClient, useClass: LocalEmbeddingClient }],
  exports: [EmbeddingClient],
})
export class EmbeddingModule {}
