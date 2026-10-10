/**
 * DI token for the ExecutionProvider. The harness injects the interface through this
 * token, so the real computer-use provider can be swapped for a fake in tests.
 */
export const EXECUTION_PROVIDER = Symbol('EXECUTION_PROVIDER');
