from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.chatbot import chatbot_service
from app.services.whatsapp import whatsapp_service


router = APIRouter()


class WhatsAppMessageRequest(BaseModel):
    to: str = Field(min_length=5, max_length=32)
    text: str = Field(min_length=1, max_length=4096)


@router.get("/webhook", include_in_schema=False)
async def verify_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
    hub_challenge: str = Query(alias="hub.challenge"),
):
    try:
        return whatsapp_service.verify_challenge(
            hub_mode, hub_verify_token, hub_challenge
        )
    except ValueError:
        raise HTTPException(status_code=403, detail="Webhook verification failed")


@router.post("/webhook")
async def receive_webhook(payload: Dict[str, Any]):
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for message in value.get("messages", []):
                if message.get("type") != "text":
                    continue

                sender = message.get("from")
                text = message.get("text", {}).get("body", "").strip()
                if not sender or not text:
                    continue

                result = await chatbot_service.process_message(
                    user_id=f"whatsapp:{sender}",
                    message=text,
                )
                await whatsapp_service.send_text(sender, result["response"])

    return {"status": "received"}


@router.post("/send")
async def send_whatsapp_message(request: WhatsAppMessageRequest):
    try:
        return await whatsapp_service.send_text(request.to, request.text)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
