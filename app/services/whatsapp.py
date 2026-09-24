import os
from typing import Any, Dict

import aiohttp


class WhatsAppService:
    def __init__(self):
        self.access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
        self.phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
        self.verify_token = os.getenv("WHATSAPP_VERIFY_TOKEN")
        self.api_version = os.getenv("WHATSAPP_API_VERSION", "v21.0")

    @property
    def configured(self) -> bool:
        return bool(
            self.access_token
            and self.phone_number_id
            and self.verify_token
        )

    def verify_challenge(self, mode: str, token: str, challenge: str) -> str:
        if mode != "subscribe" or not self.verify_token or token != self.verify_token:
            raise ValueError("WhatsApp webhook verification failed")
        return challenge

    async def send_text(self, to: str, text: str) -> Dict[str, Any]:
        if not self.configured:
            raise RuntimeError("WhatsApp Cloud API is not configured")

        url = (
            f"https://graph.facebook.com/{self.api_version}/"
            f"{self.phone_number_id}/messages"
        )
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                body = await response.json()
                if response.status >= 400:
                    detail = body.get("error", {}).get("message", "WhatsApp API request failed")
                    raise RuntimeError(detail)
                return body


whatsapp_service = WhatsAppService()
