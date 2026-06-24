import uvicorn
from fastapi import FastAPI, Request
import json

app = FastAPI()

@app.post("/webhook")
async def handle_webhook(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or auth_header != "Bearer test-api-key":
        return {"error": "Unauthorized"}, 401
    
    data = await request.json()
    return {"output": f"Mock output for {data.get('subtask_description')}"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=9999)
