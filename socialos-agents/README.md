# SocialOS Agents

Ready-to-deploy AI agents for social media engagement, community management, and content creation. These pre-built agents can be used out-of-the-box with minimal configuration.

## Available Agents

### ContentCrafter

An AI agent optimized for creating high-quality, engaging social media content:

- Generates platform-optimized posts
- Adapts to brand voice and tone
- Schedules content for optimal engagement
- Tracks performance and adapts strategy

### CommunityWatchdog

Monitors social media for mentions, sentiment, and engagement opportunities:

- Real-time mention tracking
- Sentiment analysis for brand mentions
- Competitor monitoring
- Engagement opportunity detection
- Crisis detection and alerting

### StorytellerSurfer

Creates narrative-driven content based on trending topics and user interests:

- Trend detection and monitoring
- Narrative framework application
- Sequential content creation
- Storytelling across multiple posts
- Engagement tracking for story arcs

## Getting Started

Each agent comes with configuration templates and sample outputs to help you get started quickly.

```javascript
const { ContentCrafter } = require('@socialos/agents/content-crafter');

// Create a new ContentCrafter agent
const contentAgent = new ContentCrafter({
  brandVoice: 'friendly and informative',
  topics: ['web3', 'blockchain', 'AI', 'tech'],
  postFrequency: 3, // posts per day
  platforms: ['x', 'linkedin']
});

// Connect to platform
await contentAgent.connect({
  xApiKey: process.env.TWITTER_API_KEY,
  xApiSecret: process.env.TWITTER_API_SECRET
});

// Generate and post content
await contentAgent.createAndPostContent();
```

## Agent Configuration

All agents accept a standard configuration object with the following common properties:

```javascript
{
  // Basic agent settings
  name: 'My Agent',
  description: 'Agent description',
  
  // Connection settings
  platforms: ['x', 'linkedin', 'discord'],
  
  // Memory settings
  memoryDepth: 30, // days to remember
  contextWindow: 10, // recent posts to consider
  
  // Behavior settings
  postFrequency: 5, // posts per day
  activeHours: [8, 20], // active from 8am to 8pm
  responseTimeout: 60, // minutes to respond to mentions
  
  // Advanced settings
  model: 'gpt-4', // or any compatible LLM
  embeddingModel: 'text-embedding-3-large',
  temperature: 0.7,
  
  // Persona settings
  tone: 'friendly',
  style: 'informative',
  personality: 'helpful and enthusiastic'
}
```

## Customization

While these agents are ready to use, they can also be customized or extended:

- Override default methods
- Add custom prompts
- Extend the agent class
- Combine multiple agents into a workflow

See the [SocialOS Agent SDK](/socialos-agent-sdk) for more information on customizing and extending agents.
