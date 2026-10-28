import { Test } from '@nestjs/testing';
import { EmbeddingClient } from '../embedding.client';
import { EmbeddingModule } from '../embedding.module';
import { LocalEmbeddingClient } from '../local-embedding.client';

describe('EmbeddingModule', () => {
  it('resolves the EmbeddingClient contract to the local model', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [EmbeddingModule] }).compile();

    expect(moduleRef.get(EmbeddingClient)).toBeInstanceOf(LocalEmbeddingClient);
  });
});
