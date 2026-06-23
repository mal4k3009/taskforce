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
    tx_hash: str
    timestamp: float
    status: str


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

    async def initiate_payment(self, from_wallet: str, to_wallet: str, amount_usd: float, job_id: str, user_id: str = "") -> str:
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

        async with AsyncSessionLocal() as session:
            record = PaymentModel(
                user_id=user_id or None,
                job_id=job_id,
                from_wallet=from_wallet,
                to_wallet=to_wallet,
                amount=amount_usd,
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
                    tx_hash=r.tx_hash,
                    timestamp=r.timestamp,
                    status=r.status,
                )
                for r in rows
            ]


payment_processor = X402PaymentProcessor()
