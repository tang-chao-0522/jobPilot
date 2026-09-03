import type { ModelEvent, ModelRequest } from './model-types';

export interface ModelAdapter {
  readonly modelId: string;
  stream(request: ModelRequest): AsyncIterable<ModelEvent>;
}
