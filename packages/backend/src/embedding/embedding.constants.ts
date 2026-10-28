/** The sentence-embedding model, run in this process. Downloaded once on first use and cached on disk. */
export const EMBEDDING_MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

/** How many numbers the model returns. Columns holding its vectors are fixed at this width. */
export const EMBEDDING_DIMENSIONS = 384;
