// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ERC8004Registry
 * @dev Registry for Autonomous Agent Identity & Reputation on Avalanche C-Chain
 */
contract ERC8004Registry {
    
    struct AgentIdentity {
        bytes32 agentId;
        address wallet;
        string metadataURI;
        uint256 reputationScore; // Scale 0-100
        uint256 totalJobs;
        bool isVerified;
    }

    // Mapping from agentId (bytes32 UUID representation) to identity details
    mapping(bytes32 => AgentIdentity) public registry;
    
    // Mapping from wallet address to agentId for lookup
    mapping(address => bytes32) public walletToAgentId;

    event AgentRegistered(bytes32 indexed agentId, address indexed wallet, string metadataURI);
    event ReputationUpdated(bytes32 indexed agentId, uint256 newReputationScore, uint256 totalJobs);

    modifier onlyVerified() {
        require(registry[walletToAgentId[msg.sender]].isVerified, "Caller is not a verified agent");
        _;
    }

    /**
     * @notice Registers a new agent in the ERC-8004 registry
     */
    function registerAgent(
        bytes32 _agentId,
        address _wallet,
        string calldata _metadataURI
    ) external {
        require(registry[_agentId].wallet == address(0), "Agent already registered");
        require(_wallet != address(0), "Invalid wallet address");

        registry[_agentId] = AgentIdentity({
            agentId: _agentId,
            wallet: _wallet,
            metadataURI: _metadataURI,
            reputationScore: 80, // Default baseline reputation
            totalJobs: 0,
            isVerified: true
        });

        walletToAgentId[_wallet] = _agentId;

        emit AgentRegistered(_agentId, _wallet, _metadataURI);
    }

    /**
     * @notice Retrieves agent profile by ID
     */
    function getAgent(bytes32 _agentId) external view returns (AgentIdentity memory) {
        require(registry[_agentId].wallet != address(0), "Agent does not exist");
        return registry[_agentId];
    }

    /**
     * @notice Updates agent reputation score based on job outcomes
     */
    function updateReputation(
        bytes32 _agentId,
        uint256 _newReputationScore,
        bool _jobSuccess
    ) external {
        // In real deployment, this would be restricted to authorized payment processors or multi-sigs
        require(registry[_agentId].wallet != address(0), "Agent does not exist");
        require(_newReputationScore <= 100, "Reputation score must be 0-100");

        AgentIdentity storage identity = registry[_agentId];
        identity.reputationScore = _newReputationScore;
        identity.totalJobs += 1;

        emit ReputationUpdated(_agentId, _newReputationScore, identity.totalJobs);
    }

    /**
     * @notice Checks if an agent is verified
     */
    function isVerified(bytes32 _agentId) external view returns (bool) {
        return registry[_agentId].isVerified;
    }
}
