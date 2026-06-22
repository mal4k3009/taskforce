// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title X402PaymentProcessor
 * @dev Solidity stub simulating x402 stablecoin micropayments for autonomous tasks.
 */
contract X402PaymentProcessor {

    struct Payment {
        bytes32 jobId;
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
        bool verified;
    }

    // Mapping from payment ID (tx_hash representation or custom ID) to Payment details
    mapping(bytes32 => Payment) public payments;

    event PaymentProcessed(bytes32 indexed paymentId, bytes32 indexed jobId, address indexed from, address to, uint256 amount);
    event PaymentVerified(bytes32 indexed paymentId, bool success);

    /**
     * @notice Processes stablecoin micropayment for a specific autonomous agent task.
     * @param _jobId The unique ID of the orchestration subtask.
     * @param _to The recipient agent's wallet address.
     * @param _amount The payment amount in stablecoin decimals (e.g. 6 decimals for USDC).
     */
    function processPayment(
        bytes32 _jobId,
        address _to,
        uint256 _amount
    ) external payable returns (bytes32 paymentId) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be greater than zero");

        // Generate a pseudo payment ID from msg.sender, block timestamp and jobId
        paymentId = keccak256(abi.encodePacked(msg.sender, _to, _amount, _jobId, block.timestamp));

        payments[paymentId] = Payment({
            jobId: _jobId,
            from: msg.sender,
            to: _to,
            amount: _amount,
            timestamp: block.timestamp,
            verified: true // In this basic stub we mark it verified immediately upon processing
        });

        emit PaymentProcessed(paymentId, _jobId, msg.sender, _to, _amount);
        emit PaymentVerified(paymentId, true);
        
        return paymentId;
    }

    /**
     * @notice Verifies if a payment has been successfully processed
     */
    function verifyPayment(bytes32 _paymentId) external view returns (bool) {
        return payments[_paymentId].verified && payments[_paymentId].amount > 0;
    }
}
