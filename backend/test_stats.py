import asyncio
import sys
sys.path.append('c:\\Users\\malak\\Desktop\\CODES\\TASKFORCE\\backend')
from database import init_db
from models import User
from main import get_stats

async def test():
    await init_db()
    user = User(user_id="test")
    try:
        stats = await get_stats(user)
        print("Stats:", stats)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test())
