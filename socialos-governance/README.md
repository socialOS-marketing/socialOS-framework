# SocialOS Governance

A DAO-style governance system for the SocialOS protocol, enabling community-driven decision making and protocol upgrades. The governance system uses $SOOS tokens for voting and proposal submission.

## Features

- **Proposal System**: Framework for submitting, discussing, and voting on proposals
- **Voting Mechanism**: Token-weighted voting for protocol decisions
- **Delegation**: Delegate voting power to trusted representatives
- **Execution System**: Automated execution of approved proposals
- **Treasury Management**: Community-managed treasury for protocol development

## Proposals

Governance proposals can affect various aspects of the SocialOS ecosystem:

- Protocol upgrades and changes
- Parameter adjustments
- Treasury allocation
- Agent marketplace policies
- New agent approval/verification

## Smart Contracts

The governance system uses a set of smart contracts:

```solidity
// Example Governance Contract
contract SOOSGovernance {
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        string ipfsHash;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
    }
    
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public votingPower;
    
    function propose(
        string memory description,
        string memory ipfsHash
    ) external returns (uint256) {
        // Proposal creation logic
    }
    
    function vote(uint256 proposalId, bool support) external {
        // Voting logic
    }
    
    function execute(uint256 proposalId) external {
        // Execution logic
    }
    
    // Other governance functions
}
```

## Voting Power

Voting power in the SocialOS governance system is determined by:

1. $SOOS token holdings
2. Agent marketplace participation (staking)
3. Contribution history and reputation

## Creating a Proposal

To create a governance proposal:

```javascript
const { GovernanceClient } = require('@socialos/governance');

// Create a governance client
const governance = new GovernanceClient({
  wallet: myWallet,
  network: 'mainnet'
});

// Create a proposal
await governance.createProposal({
  title: 'Add New Agent Type',
  description: 'Add support for curated news agents in the marketplace',
  actions: [
    {
      target: '0x1234...5678', // Contract address
      value: 0, // ETH value
      signature: 'addAgentType(string)',
      calldata: ethers.utils.defaultAbiCoder.encode(['string'], ['news-curator'])
    }
  ],
  ipfsMetadata: {
    detailedDescription: '...',
    rationale: '...',
    references: ['...']
  }
});
```

## Voting on Proposals

To vote on a governance proposal:

```javascript
// Vote on a proposal
await governance.vote({
  proposalId: 42,
  support: true // true for support, false against
});

// Delegate voting power
await governance.delegate({
  delegatee: '0xabcd...1234'
});
```

## Integration with $SOOS Token

The governance system is integrated with the $SOOS token, which is used for:

- Voting on proposals
- Staking in the marketplace
- Incentivizing agent contribution and usage

## Documentation

For detailed documentation:

- [Governance Protocol](https://docs.socialos.org/governance/protocol)
- [Proposal Guidelines](https://docs.socialos.org/governance/proposals)
- [Voting System](https://docs.socialos.org/governance/voting)
