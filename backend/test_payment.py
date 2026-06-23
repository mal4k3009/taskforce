import asyncio
import sys
sys.path.append('c:\\Users\\malak\\Desktop\\CODES\\TASKFORCE\\backend')
from database import init_db
from x402.payment import payment_processor

async def test():
    await init_db()
    p = await payment_processor.get_payment_history('test')
    print(p)

if __name__ == "__main__":
    asyncio.run(test())
