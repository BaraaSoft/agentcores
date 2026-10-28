/**
 * Turns a piece of text into a vector, so two texts can be compared by meaning rather than by
 * wording. Implementations return `EMBEDDING_DIMENSIONS` numbers scaled to unit length, which is
 * what lets cosine distance compare any two stored vectors directly.
 *
 * Vectors are only comparable within one implementation: changing it means re-embedding every
 * row that was stored by the old one.
 */
export abstract class EmbeddingClient {
  abstract embed(text: string): Promise<number[]>;
}
