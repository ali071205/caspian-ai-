import asyncio
import json
import logging
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger("websocket_manager")


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []
        self._loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, websocket: WebSocket) -> None:
        self._loop = asyncio.get_running_loop()
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining active: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: dict[str, Any]) -> None:
        if not self.active_connections:
            return
        payload = json.dumps({"event": event_type, "data": data}, default=str)
        dead_connections: list[WebSocket] = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception as exc:
                logger.warning(f"Error sending message to WebSocket client: {exc}")
                dead_connections.append(connection)
        for dead in dead_connections:
            self.disconnect(dead)

    def emit(self, event_type: str, data: dict[str, Any]) -> None:
        """Threadsafe trigger that schedules a broadcast on the main event loop from any thread."""
        if not self.active_connections:
            return
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(self.broadcast(event_type, data), self._loop)
        else:
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(self.broadcast(event_type, data))
            except RuntimeError:
                pass


ws_manager = ConnectionManager()
