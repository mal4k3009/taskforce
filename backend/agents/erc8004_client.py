import os
import json
import logging
from typing import Optional, List
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
from .registry import registry_instance, AgentProfile

logger = logging.getLogger(__name__)

ERC8004_REGISTRY_ADDRESS = os.getenv("ERC8004_REGISTRY_ADDRESS")
AVALANCHE_RPC_URL = os.getenv("AVALANCHE_RPC_URL", "https://api.avax-test.network/ext/bc/C/rpc")

w3 = Web3(Web3.HTTPProvider(AVALANCHE_RPC_URL))
w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

def get_erc8004_abi():
    path = os.path.join(os.path.dirname(__file__), "..", "..", "artifacts", "contracts", "ERC8004Registry.sol", "ERC8004Registry.json")
    try:
        with open(path, "r") as f:
            return json.load(f)["abi"]
    except Exception as e:
        logger.error(f"Could not load ERC8004 ABI: {e}")
        return []

async def get_agent_identity(agent_id: str) -> Optional[AgentProfile]:
    if ERC8004_REGISTRY_ADDRESS:
        logger.info(f"ERC8004 contract configured at {ERC8004_REGISTRY_ADDRESS} — querying DB registry")
    return await registry_instance.get_agent(agent_id)

async def get_reputation_score(agent_id: str) -> Optional[float]:
    agent = await get_agent_identity(agent_id)
    return agent.reputation_score if agent else None

async def update_reputation(agent_id: str, job_success: bool, feedback: str) -> Optional[AgentProfile]:
    delta = 0.1 if job_success else -0.5

    private_key = os.getenv("DEPLOYER_PRIVATE_KEY")
    abi = get_erc8004_abi()

    if ERC8004_REGISTRY_ADDRESS and private_key and abi:
        agent = await registry_instance.get_agent(agent_id)
        if not agent:
            return None
        try:
            logger.info(f"Submitting reputation update to chain for {agent_id}")
            account = w3.eth.account.from_key(private_key)
            contract = w3.eth.contract(address=ERC8004_REGISTRY_ADDRESS, abi=abi)

            agent_bytes = Web3.to_bytes(hexstr=agent.erc8004_identity_hash)
            new_score = int(max(0, min(100, agent.reputation_score + delta)))

            tx = contract.functions.updateReputation(
                agent_bytes,
                new_score,
                job_success
            ).build_transaction({
                'from': account.address,
                'nonce': w3.eth.get_transaction_count(account.address),
                'gas': 200000,
                'maxFeePerGas': w3.to_wei('50', 'gwei'),
                'maxPriorityFeePerGas': w3.to_wei('2', 'gwei'),
            })

            signed_tx = w3.eth.account.sign_transaction(tx, private_key=private_key)
            tx_hash_bytes = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            tx_hash = w3.to_hex(tx_hash_bytes)

            logger.info(f"Broadcasted reputation tx: {tx_hash}. Waiting for receipt...")
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash_bytes)

            if receipt.status != 1:
                logger.error(f"Reputation update failed: {tx_hash}")

        except Exception as e:
            logger.error(f"Web3 reputation transaction error: {e}")

    return await registry_instance.update_agent_reputation(agent_id, delta, job_success)

async def discover_agents_by_specialty(specialty: str) -> List[AgentProfile]:
    return await registry_instance.find_by_specialty(specialty)
