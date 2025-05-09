# SocialOS Agent SDK

A comprehensive toolkit for building custom AI agents for social media platforms. This SDK provides the building blocks, utilities, and abstractions needed to create powerful, contextual social agents.

## Features

- **Agent Framework**: Base classes and interfaces for custom agents
- **Platform Connectors**: Pre-built connectors for social platforms (X/Twitter, LinkedIn, Discord)
- **Memory Integration**: Tools for persistent agent memory and context
- **LangChain Integration**: Utilities for working with language models
- **Testing Tools**: Frameworks for testing agent behavior
- **Templates**: Boilerplate code for different agent types

## Installation

```bash
npm install @socialos/agent-sdk
```

## Quick Start

```javascript
const { Agent, XPlatform } = require('@socialos/agent-sdk');

class MyCustomAgent extends Agent {
  constructor(config) {
    super(config);
    this.name = config.name || 'My Custom Agent';
  }
  
  async generateResponse(context) {
    // Custom logic for generating responses
    const prompt = this.buildPrompt(context);
    const response = await this.llm.complete(prompt);
    return response;
  }
  
  async onMention(mention) {
    // Handle when someone mentions your agent
    const response = await this.generateResponse(mention);
    await this.reply(mention, response);
  }
}

// Create and deploy your agent
const myAgent = new MyCustomAgent({
  model: 'gpt-4',
  temperature: 0.7,
  tone: 'helpful and engaging'
});

// Connect to X/Twitter
await myAgent.connect(XPlatform, {
  apiKey: process.env.TWITTER_API_KEY,
  apiSecret: process.env.TWITTER_API_SECRET
});

// Start the agent
await myAgent.start();
```

## Agent Types

The SDK includes templates for common agent types:

- **ContentAgent**: For creating original content
- **ResponseAgent**: For responding to mentions and messages
- **MonitorAgent**: For monitoring trends, mentions, or content
- **CuratorAgent**: For finding and sharing relevant content
- **ConversationAgent**: For multi-turn conversations

## Memory Systems

Agents need memory to be contextual and coherent over time:

```javascript
const { VectorMemory } = require('@socialos/agent-sdk');

// Create a memory system
const memory = new VectorMemory({
  namespace: 'my-agent',
  embedding: 'text-embedding-3-large'
});

// Store something in memory
await memory.store('user-preferences', {
  user: '@example',
  topics: ['AI', 'blockchain'],
  tone: 'technical'
});

// Retrieve contextual information
const context = await memory.retrieveRelevant('How do I implement a blockchain?');
```

## LangChain Integration

The SDK integrates with LangChain for complex agent workflows:

```javascript
const { LangChainAgent } = require('@socialos/agent-sdk');
const { ConversationChain } = require('langchain/chains');

// Create a LangChain-based agent
const agent = new LangChainAgent({
  chain: new ConversationChain({
    memory: new BufferMemory(),
    llm: new OpenAI({ temperature: 0.7 })
  })
});

// Use the agent
const response = await agent.run("What's the latest trend in AI?");
```

## Testing

The SDK includes tools for testing agents:

```javascript
const { AgentTester } = require('@socialos/agent-sdk/testing');

// Create a test harness
const tester = new AgentTester(myAgent);

// Test a response to a mention
const result = await tester.testMention({
  from: '@testuser',
  content: 'What do you think about the latest Apple announcement?'
});

// Assert on the response
expect(result.response).toContain('Apple');
expect(result.tone).toBe('informative');
```

## Documentation

For detailed documentation:

- [API Reference](https://docs.socialos.org/agent-sdk/api)
- [Tutorials](https://docs.socialos.org/agent-sdk/tutorials)
- [Examples](https://docs.socialos.org/agent-sdk/examples)
