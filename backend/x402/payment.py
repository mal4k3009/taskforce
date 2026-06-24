import os
import uuid
import time
import json
import logging
from typing import List, Optional
from dataclasses import dataclass
from sqlalchemy import select, desc
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

from database import AsyncSessionLocal
from models import Payment as PaymentModel

logger = logging.getLogger(__name__)


@dataclass
class PaymentRecord:
    job_id: str
    from_wallet: str
    to_wallet: str
    amount: float
    agent_id: str = ""
    platform_fee: float = 0.0
    tx_hash: str = ""
    timestamp: float = 0.0
    status: str = "CONFIRMED"


AVALANCHE_RPC_URL = os.getenv("AVALANCHE_RPC_URL", "https://api.avax-test.network/ext/bc/C/rpc")
w3 = Web3(Web3.HTTPProvider(AVALANCHE_RPC_URL))
w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)


def get_x402_abi():
    path = os.path.join(os.path.dirname(__file__), "..", "..", "artifacts", "contracts", "X402PaymentProcessor.sol", "X402PaymentProcessor.json")
    try:
        with open(path, "r") as f:
            return json.load(f)["abi"]
    except Exception as e:
        logger.error(f"Could not load X402 ABI: {e}")
        return []


class X402PaymentProcessor:
    def __init__(self):
        self.contract_address = os.getenv("X402_PAYMENT_PROCESSOR_ADDRESS")
        self.private_key = os.getenv("DEPLOYER_PRIVATE_KEY")
        if self.private_key:
            self.account = w3.eth.account.from_key(self.private_key)
        else:
            self.account = None

        abi = get_x402_abi()
        if self.contract_address and abi:
            self.contract = w3.eth.contract(address=self.contract_address, abi=abi)
        else:
            self.contract = None

    PLATFORM_FEE_PERCENTAGE = 0.10

    async def initiate_payment(self, from_wallet: str, to_wallet: str, amount_usd: float, job_id: str, user_id: str = "", agent_id: str = "") -> str:
        tx_hash = ""
        if self.contract and self.account:
            try:
                logger.info(f"Initiating on-chain x402 payment via {self.contract_address}")

                job_bytes = Web3.keccak(text=job_id)
                amount_wei = w3.to_wei(0.0001, 'ether')

                tx = self.contract.functions.processPayment(
                    job_bytes,
                    w3.to_checksum_address(to_wallet),
                    amount_wei
                ).build_transaction({
                    'from': self.account.address,
                    'value': amount_wei,
                    'nonce': w3.eth.get_transaction_count(self.account.address),
                    'gas': 300000,
                    'maxFeePerGas': w3.to_wei('50', 'gwei'),
                    'maxPriorityFeePerGas': w3.to_wei('2', 'gwei'),
                })

                signed_tx = w3.eth.account.sign_transaction(tx, private_key=self.private_key)
                tx_hash_bytes = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
                tx_hash = w3.to_hex(tx_hash_bytes)

                logger.info(f"Broadcasted payment tx: {tx_hash}. Waiting for receipt...")
                receipt = w3.eth.wait_for_transaction_receipt(tx_hash_bytes)

                if receipt.status != 1:
                    logger.error(f"Transaction failed: {tx_hash}")
                    raise Exception("Smart contract transaction reverted")

            except Exception as e:
                logger.error(f"Web3 transaction error: {e}")
                tx_hash = f"0x{uuid.uuid4().hex}"
        else:
            tx_hash = f"0x{uuid.uuid4().hex}"

        platform_fee = round(amount_usd * self.PLATFORM_FEE_PERCENTAGE, 4) if agent_id else 0.0

        async with AsyncSessionLocal() as session:
            record = PaymentModel(
                user_id=user_id or None,
                agent_id=agent_id or None,
                job_id=job_id,
                from_wallet=from_wallet,
                to_wallet=to_wallet,
                amount=amount_usd,
                platform_fee=platform_fee,
                tx_hash=tx_hash,
                timestamp=time.time(),
                status="CONFIRMED"
            )
            session.add(record)
            await session.commit()

        return tx_hash

    async def verify_payment(self, tx_hash: str) -> bool:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(PaymentModel).where(PaymentModel.tx_hash == tx_hash)
            )
            row = result.scalar_one_or_none()
            return row is not None and row.status == "CONFIRMED"

    async def verify_user_payment(self, tx_hash: str) -> bool:
        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(select(PaymentModel).where(PaymentModel.tx_hash == tx_hash))
                if result.scalar_one_or_none():
                    logger.warning(f"Transaction {tx_hash} already used.")
                    return False
            
            tx = w3.eth.get_transaction(tx_hash)
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=10)
            
            if receipt.status != 1:
                logger.warning(f"Transaction {tx_hash} failed on-chain.")
                return False
                
            expected_treasury = os.getenv("VITE_TREASURY_WALLET_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
            if tx.to.lower() != expected_treasury.lower():
                logger.warning(f"Transaction {tx_hash} sent to wrong address: {tx.to}")
                return False
                
            if tx.value < w3.to_wei(0.0001, 'ether'):
                logger.warning(f"Transaction {tx_hash} insufficient value: {tx.value}")
                return False
                
            async with AsyncSessionLocal() as session:
                record = PaymentModel(
                    user_id=None,
                    agent_id=None,
                    job_id="PREPAY-" + tx_hash[:8],
                    from_wallet=tx['from'],
                    to_wallet=tx.to,
                    amount=0.0001,
                    platform_fee=0.0,
                    tx_hash=tx_hash,
                    timestamp=time.time(),
                    status="CONFIRMED"
                )
                session.add(record)
                await session.commit()
                
            return True
        except Exception as e:
            logger.error(f"Error verifying user payment: {e}")
            return False

    async def get_earnings_by_creator(self, creator_user_id: str) -> dict:
        from agents.registry import registry_instance
        my_agents = await registry_instance.get_agents_by_creator(creator_user_id)
        agent_ids = set(a.agent_id for a in my_agents)
        my_wallets = set(a.wallet_address for a in my_agents)

        if not agent_ids and not my_wallets:
            return {
                "total_earned_usd": 0.0,
                "total_platform_fees_usd": 0.0,
                "total_jobs": 0,
                "agent_count": len(my_agents),
                "agents": [],
            }

        async with AsyncSessionLocal() as session:
            from sqlalchemy import select as sa_select
            if agent_ids:
                query = sa_select(PaymentModel).where(PaymentModel.agent_id.in_(agent_ids))
            elif my_wallets:
                query = sa_select(PaymentModel).where(PaymentModel.to_wallet.in_(my_wallets))
            else:
                return {
                    "total_earned_usd": 0.0,
                    "total_platform_fees_usd": 0.0,
                    "total_jobs": 0,
                    "agent_count": 0,
                    "agents": [],
                }

            result = await session.execute(query)
            rows = result.scalars().all()

        total_earned = sum(r.amount for r in rows)
        total_fees = sum(r.platform_fee for r in rows)

        agent_breakdown = []
        for a in my_agents:
            agent_payments = [r for r in rows if r.agent_id == a.agent_id]
            if agent_payments:
                agent_breakdown.append({
                    "agent_id": a.agent_id,
                    "name": a.name,
                    "specialty": a.specialty,
                    "reputation_score": a.reputation_score,
                    "completed_jobs": a.completed_jobs,
                    "earned_usd": round(sum(p.amount for p in agent_payments), 2),
                    "fees_usd": round(sum(p.platform_fee for p in agent_payments), 2),
                })

        return {
            "total_earned_usd": round(total_earned, 2),
            "total_platform_fees_usd": round(total_fees, 2),
            "total_jobs": len(rows),
            "agent_count": len(my_agents),
            "agents": agent_breakdown,
        }

    async def get_payment_history(self, user_id: Optional[str] = None) -> List[PaymentRecord]:
        async with AsyncSessionLocal() as session:
            query = select(PaymentModel).order_by(desc(PaymentModel.timestamp))
            if user_id:
                query = query.where(PaymentModel.user_id == user_id)
            result = await session.execute(query)
            rows = result.scalars().all()
            return [
                PaymentRecord(
                    job_id=r.job_id,
                    from_wallet=r.from_wallet,
                    to_wallet=r.to_wallet,
                    amount=r.amount,
                    agent_id=r.agent_id or "",
                    platform_fee=r.platform_fee or 0.0,
                    tx_hash=r.tx_hash,
                    timestamp=r.timestamp,
                    status=r.status,
                )
                for r in rows
            ]


payment_processor = X402PaymentProcessor()
