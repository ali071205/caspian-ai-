import asyncio
import logging
from typing import Any
from .database import SessionLocal
from .teamops import process_message
from .websocket_manager import ws_manager

logger = logging.getLogger("queue_worker")


class AsyncMessageQueue:
    def __init__(self) -> None:
        self.queue: asyncio.Queue[dict[str, Any]] | None = None
        self._worker_task: asyncio.Task | None = None

    def start(self) -> None:
        if self.queue is None:
            self.queue = asyncio.Queue()
        if self._worker_task is None or self._worker_task.done():
            self._worker_task = asyncio.create_task(self._process_queue())
            logger.info("Async message queue worker started.")

    async def enqueue(self, message: str, sender_name: str | None = None, channel: str = "app") -> None:
        if self.queue is None:
            self.queue = asyncio.Queue()
        if self._worker_task is None or self._worker_task.done():
            self.start()
        await self.queue.put({
            "message": message,
            "sender_name": sender_name,
            "channel": channel,
        })

    async def _process_queue(self) -> None:
        while True:
            if self.queue is None:
                await asyncio.sleep(0.5)
                continue
            item = await self.queue.get()
            try:
                with SessionLocal() as db:
                    result = process_message(
                        db=db,
                        message=item["message"],
                        sender_name=item["sender_name"],
                        channel=item["channel"],
                    )
                # Broadcast real-time event
                await ws_manager.broadcast("teamops_event", {
                    "channel": item["channel"],
                    "sender": item["sender_name"],
                    "result": result,
                })
            except Exception as exc:
                logger.error(f"Error processing queued message: {exc}", exc_info=True)
            finally:
                self.queue.task_done()


async_queue = AsyncMessageQueue()
