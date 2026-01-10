"""
WebSocket Bridge Microservice

Subscribes to Redis pub/sub channels and broadcasts messages to connected WebSocket clients.
Each tenant has their own channel: orders:{tenant_id}
"""
import asyncio
import json
import os
from contextlib import asynccontextmanager

import redis.asyncio as redis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware


# Store connected clients per tenant
connections: dict[int, set[WebSocket]] = {}


async def redis_listener():
    """Subscribe to Redis and broadcast to WebSocket clients."""
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    while True:
        try:
            r = redis.from_url(redis_url)
            pubsub = r.pubsub()
            
            # Subscribe to all order channels using pattern
            await pubsub.psubscribe("orders:*")
            
            async for message in pubsub.listen():
                if message["type"] == "pmessage":
                    # Extract tenant_id from channel name (orders:123)
                    channel = message["channel"].decode()
                    tenant_id = int(channel.split(":")[1])
                    data = message["data"].decode()
                    
                    # Broadcast to all connected clients for this tenant
                    if tenant_id in connections:
                        dead_connections = set()
                        for ws in connections[tenant_id]:
                            try:
                                await ws.send_text(data)
                            except Exception:
                                dead_connections.add(ws)
                        
                        # Clean up dead connections
                        connections[tenant_id] -= dead_connections
                        
        except Exception as e:
            print(f"Redis connection error: {e}")
            await asyncio.sleep(5)  # Retry after 5 seconds


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start Redis listener on startup
    task = asyncio.create_task(redis_listener())
    yield
    task.cancel()


app = FastAPI(title="WS Bridge", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "connections": sum(len(c) for c in connections.values())}


@app.websocket("/ws/{tenant_id}")
async def websocket_endpoint(websocket: WebSocket, tenant_id: int):
    """WebSocket endpoint for real-time order updates per tenant."""
    await websocket.accept()
    
    # Add to connections
    if tenant_id not in connections:
        connections[tenant_id] = set()
    connections[tenant_id].add(websocket)
    
    try:
        while True:
            # Keep connection alive, handle any incoming messages
            data = await websocket.receive_text()
            # Could handle client messages here if needed (e.g., ping/pong)
    except WebSocketDisconnect:
        pass
    finally:
        # Remove from connections
        if tenant_id in connections:
            connections[tenant_id].discard(websocket)
            if not connections[tenant_id]:
                del connections[tenant_id]
