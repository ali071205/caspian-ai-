import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.voice_service import VoiceDirective, summarize_and_extract_voice_directive, transcribe_audio_groq
from app.websocket_manager import ConnectionManager
from app.queue_worker import AsyncMessageQueue


def test_health_with_websockets(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_websocket_manager_lifecycle():
    manager = ConnectionManager()
    assert len(manager.active_connections) == 0

    mock_ws = MagicMock()
    mock_ws.accept = AsyncMock()
    mock_ws.send_text = AsyncMock()

    # Connect
    import asyncio
    asyncio.run(manager.connect(mock_ws))
    assert len(manager.active_connections) == 1
    mock_ws.accept.assert_awaited_once()

    # Broadcast
    asyncio.run(manager.broadcast("test_event", {"hello": "world"}))
    mock_ws.send_text.assert_awaited_once()

    # Disconnect
    manager.disconnect(mock_ws)
    assert len(manager.active_connections) == 0


def test_async_chat_enqueue(client):
    res = client.post("/chat/async", json={
        "message": "Rahul, Monday tak API complete kar dena.",
        "sender_name": "Ali",
        "channel": "slack"
    })
    assert res.status_code == 200
    assert res.json()["status"] == "enqueued"


def test_groq_whisper_transcription_mock():
    with patch("app.voice_service.groq_enabled", return_value=True):
        with patch("groq.Groq") as mock_groq_class:
            mock_client = MagicMock()
            mock_groq_class.return_value = mock_client
            mock_client.audio.transcriptions.create.return_value = MagicMock(text="Rahul Monday tak API complete kar dena")

            text = transcribe_audio_groq(b"dummy-audio-bytes", "test.mp3")
            assert "Rahul" in text
            assert "API complete" in text


def test_voice_directive_summarization():
    with SessionLocal() as db:
        with patch("app.voice_service.gemini_enabled", return_value=True):
            with patch("google.genai.Client") as mock_genai_client:
                mock_client_instance = MagicMock()
                mock_genai_client.return_value = mock_client_instance
                mock_client_instance.interactions.create.return_value = MagicMock(
                    output_text='{"summary": "Assign API completion to Rahul by Monday", "needs_task": true, "actionable_directive": "API complete", "owner_id": 1, "deadline_hours": 24, "priority": "normal"}'
                )

                result = summarize_and_extract_voice_directive(
                    db=db,
                    transcript="Rahul, Monday tak API complete kar dena.",
                    sender_name="Ali"
                )
                assert result["transcript"] == "Rahul, Monday tak API complete kar dena."
                assert "summary" in result
                assert "teamops_result" in result


def test_audio_upload_endpoint_mock(client):
    with patch("app.main.transcribe_audio_groq", return_value="Rahul, Monday tak API complete kar dena."):
        audio_content = b"fake-audio-binary-data"
        res = client.post(
            "/audio/transcribe-and-route",
            files={"file": ("voice_note.m4a", audio_content, "audio/m4a")},
            data={"sender_name": "Ali"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "transcript" in data
        assert "summary" in data
        assert "teamops_result" in data
        assert data["audio"] == {
            "filename": "voice_note.m4a",
            "content_type": "audio/m4a",
            "size_bytes": len(audio_content),
        }
