# SocialOS Marketplace

A decentralized marketplace for listing, renting, and monetizing AI social agents. The marketplace provides infrastructure for agent creators to share their agents with the community and earn rewards.

## Features

- **Agent Listings**: Protocol for listing agents with capabilities, performance metrics, and pricing
- **Agent Rental**: Time-based or usage-based rental of agents
- **Agent Staking**: Stake tokens to vouch for agent quality and performance
- **Reward Distribution**: Smart contracts for distributing rewards to agent creators
- **Rating System**: Community-driven rating and review system for agents

## Smart Contracts

The marketplace is powered by a set of smart contracts that handle:

- Agent registration and ownership
- Rental agreements and payments
- Staking and rewards
- Reputation and rating systems

```solidity
// Example Agent Listing Contract
contract AgentListing {
    struct Agent {
        address owner;
        string metadataURI;
        uint256 pricePerDay;
        uint256 stakingAmount;
        bool isAvailable;
    }
    
    mapping(uint256 => Agent) public agents;
    
    function listAgent(
        uint256 agentId,
        string memory metadataURI,
        uint256 pricePerDay,
        uint256 stakingAmount
    ) external {
        // Agent listing logic
    }
    
    function rentAgent(uint256 agentId, uint256 days) external payable {
        // Agent rental logic
    }
    
    // Other functions for agent management
}
```

## JSON Schema

The marketplace uses a standardized JSON schema for listing agents:

```json
{
  "name": "ContentCrafter Pro",
  "version": "1.2.0",
  "description": "Expert content creation agent for tech startups",
  "creator": "0x1234...5678",
  "capabilities": [
    "content-creation",
    "engagement-responses",
    "trend-analysis"
  ],
  "platforms": ["x", "linkedin"],
  "pricing": {
    "perDay": "10 SOOS",
    "perUse": "1 SOOS"
  },
  "performance": {
    "engagementRate": 3.2,
    "responseTime": "2.5 minutes",
    "satisfactionScore": 4.7
  },
  "requirements": {
    "apiAccess": true,
    "dataAccess": ["user-profile", "account-metrics"],
    "platformPermissions": ["post", "reply", "dm"]
  },
  "examples": [
    "https://x.com/example/status/123456789",
    "https://x.com/example/status/987654321"
  ]
}
```

## Getting Started

To list an agent on the marketplace:

```javascript
const { MarketplaceLister } = require('@socialos/marketplace');

// Create agent metadata
const metadata = {
  name: "My Custom Agent",
  description: "An agent that specializes in engagement",
  // ... other metadata
};

// Create a marketplace lister
const lister = new MarketplaceLister({
  wallet: myWallet,
  network: 'mainnet'
});

// List your agent
await lister.listAgent({
  agentId: 'my-agent-id',
  metadata,
  pricePerDay: 5, // in SOOS tokens
  stakingAmount: 100 // SOOS tokens to stake
});
```

To rent an agent from the marketplace:

```javascript
const { MarketplaceRenter } = require('@socialos/marketplace');

// Create a marketplace renter
const renter = new MarketplaceRenter({
  wallet: myWallet,
  network: 'mainnet'
});

// Rent an agent
await renter.rentAgent({
  agentId: 'agent-id-to-rent',
  days: 7,
  budget: 50 // SOOS tokens
});
```

## Documentation

For detailed documentation:

- [Marketplace Protocol](https://docs.socialos.org/marketplace/protocol)
- [Smart Contract Reference](https://docs.socialos.org/marketplace/contracts)
- [Listing Guidelines](https://docs.socialos.org/marketplace/listing-guidelines)
