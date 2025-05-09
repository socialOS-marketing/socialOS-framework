# SocialOS Core

The foundational infrastructure for the SocialOS framework, providing essential services for agent orchestration, memory persistence, and runtime execution.

## Components

### Orchestration

Multi-agent orchestration system built on LangChain, allowing multiple AI agents to collaborate in workflows. The orchestration engine handles:

- Agent chaining and pipelines
- Parallel agent execution
- Error handling and fallbacks
- Message passing between agents

### Memory Layer

Persistent memory solution enabling agents to maintain context and history across sessions:

- Vector-based memory store
- Contextual retrieval
- Long-term memory persistence
- Cross-agent memory sharing

### Agent Runtime

Execution environment for SocialOS agents:

- Platform-specific connectors (X/Twitter, Discord, etc.)
- Authentication and authorization
- Rate limiting and quota management
- Plugin system for extending agent capabilities

## Getting Started

```bash
# Install dependencies
npm install

# Run a basic agent with orchestration
npm run start:agent-demo
```

## Integration

The Core infrastructure is designed to be used by the SocialOS Agent SDK. Most developers will not interact directly with these components but will instead use the higher-level abstractions provided by the SDK.

For advanced use cases requiring direct Core access:

```javascript
const { Orchestrator } = require('@socialos/core/orchestration');
const { MemoryStore } = require('@socialos/core/memory-layer');
const { XConnector } = require('@socialos/core/agent-runtime');

// Create a memory store
const memory = new MemoryStore();

// Create a connector to X/Twitter
const xConnector = new XConnector({
  apiKey: process.env.TWITTER_API_KEY,
  apiSecret: process.env.TWITTER_API_SECRET
});

// Create an orchestrator with two agents
const orchestrator = new Orchestrator({
  agents: [trendDetector, contentCreator],
  memory,
  connector: xConnector
});

// Run the orchestrated workflow
orchestrator.run();
```

## Architecture

```
┌──────────────────────┐
│    Orchestration     │
│                      │
│  ┌────────┐ ┌─────┐  │
│  │ Agent1 │→│Agent2│  │
│  └────────┘ └─────┘  │
└────────────┬─────────┘
             │
┌────────────▼─────────┐
│    Memory Layer       │
│                      │
│  ┌────────┐ ┌─────┐  │
│  │Vector  │ │Redis │  │
│  │Store   │ │Cache │  │
│  └────────┘ └─────┘  │
└────────────┬─────────┘
             │
┌────────────▼─────────┐
│    Agent Runtime      │
│                      │
│  ┌────────┐ ┌─────┐  │
│  │Platform│ │API   │  │
│  │Connect │ │Utils │  │
│  └────────┘ └─────┘  │
└──────────────────────┘
```
