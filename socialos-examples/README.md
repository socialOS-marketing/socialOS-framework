# SocialOS Examples

Real-world examples and campaign templates showcasing how to use SocialOS agents for different use cases. These examples demonstrate complex agent configurations, multi-agent workflows, and practical applications.

## Available Examples

### NFT Drop Campaign

A complete campaign template for NFT project launches:

- Pre-launch hype generation
- Launch day engagement
- Post-launch community building
- Analytics and performance tracking

```
/nft-drop-campaign/
├── agents/                 # Agent configurations
│   ├── hype-builder.js     # Pre-launch hype agent
│   ├── drop-announcer.js   # Launch day agent
│   ├── community-manager.js # Post-launch engagement
│   └── analytics-tracker.js # Performance tracking
├── workflows/              # Multi-agent workflows
│   ├── pre-launch.js       # Pre-launch workflow
│   ├── launch-day.js       # Launch day workflow
│   └── post-launch.js      # Post-launch workflow
├── templates/              # Content templates
│   ├── countdown.js        # Countdown templates
│   ├── announcement.js     # Announcement templates
│   └── faq.js             # FAQ templates
├── config.js              # Campaign configuration
└── README.md              # Campaign documentation
```

### SaaS Launch

A campaign template for SaaS product launches:

- Product education and awareness
- Feature announcements
- User testimonial highlighting
- Technical Q&A support
- Lead generation

```
/saas-launch/
├── agents/                # Agent configurations
│   ├── product-educator.js # Product education agent
│   ├── feature-announcer.js # Feature announcements
│   ├── testimonial-curator.js # User testimonials
│   └── tech-support.js    # Technical Q&A
├── workflows/             # Multi-agent workflows
│   ├── pre-launch.js      # Pre-launch workflow
│   ├── launch-week.js     # Launch week workflow
│   └── ongoing-engagement.js # Ongoing engagement
├── templates/             # Content templates
│   ├── product-features.js # Feature templates
│   ├── testimonials.js    # Testimonial templates
│   └── faq.js            # FAQ templates
├── config.js             # Campaign configuration
└── README.md             # Campaign documentation
```

## Getting Started

To use these examples:

1. Clone the repository
2. Choose an example that fits your needs
3. Customize the configuration and templates
4. Deploy the agents using the SocialOS Agent SDK

For example:

```javascript
const { loadCampaign } = require('@socialos/examples');

// Load the NFT drop campaign
const campaign = await loadCampaign('nft-drop-campaign', {
  projectName: 'My Amazing NFTs',
  description: 'A collection of 10,000 unique NFTs',
  launchDate: '2025-06-01T12:00:00Z',
  socials: {
    twitter: '@myamazingnfts',
    discord: 'https://discord.gg/myamazingnfts'
  }
});

// Start the pre-launch phase
await campaign.startPhase('pre-launch');
```

## Customization

These examples are designed to be customized for your specific needs:

- Edit the agent configurations
- Modify the content templates
- Adjust the workflows
- Change the timing and triggers

For detailed instructions on customizing these examples, see the [Customization Guide](https://docs.socialos.org/examples/customization).

## Creating Your Own Examples

To create your own examples, you can use these as templates:

1. Copy the structure of an existing example
2. Replace the agents, workflows, and templates with your own
3. Document your example with a README.md file
4. Share your example with the community

## Documentation

For detailed documentation:

- [Examples Overview](https://docs.socialos.org/examples/overview)
- [NFT Drop Campaign](https://docs.socialos.org/examples/nft-drop)
- [SaaS Launch Campaign](https://docs.socialos.org/examples/saas-launch)
