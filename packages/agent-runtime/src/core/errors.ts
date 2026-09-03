export class AgentRuntimeError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class AgentAbortedError extends AgentRuntimeError {
  constructor() {
    super('Agent execution was cancelled', 'AGENT_ABORTED');
  }
}

export class AgentLimitError extends AgentRuntimeError {
  constructor(code: 'MAX_TURNS' | 'MAX_TOOL_CALLS') {
    super(code === 'MAX_TURNS' ? 'Agent reached max turns' : 'Agent reached max tool calls', code);
  }
}
