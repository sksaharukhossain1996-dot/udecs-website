import uuid
import os
from datetime import datetime
from typing import Optional, Dict, List
from openai import AsyncOpenAI

class ConversationManager:
    def __init__(self):
        self.conversations: Dict[str, list] = {}
    
    def create_conversation(self, user_id: str) -> str:
        conv_id = str(uuid.uuid4())
        self.conversations[conv_id] = [
            {
                "role": "system",
                "content": "You are UNICK Digital AI Agent, a helpful e-commerce assistant. Help customers with purchases, track orders, provide product info, and make recommendations."
            }
        ]
        return conv_id
    
    def add_message(self, conv_id: str, role: str, content: str):
        if conv_id not in self.conversations:
            self.conversations[conv_id] = []
        self.conversations[conv_id].append({"role": role, "content": content})
    
    def get_conversation(self, conv_id: str) -> Optional[list]:
        return self.conversations.get(conv_id)

class ChatbotService:
    def __init__(self):
        self.conversation_manager = ConversationManager()
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_client = (
            AsyncOpenAI(api_key=self.openai_api_key)
            if self.openai_api_key and not self.openai_api_key.startswith("your_")
            else None
        )
        self.intents = {
            "order_tracking": ["track", "order", "where", "status", "delivery"],
            "product_info": ["product", "price", "details", "description", "specs"],
            "recommendation": ["recommend", "suggest", "similar", "like", "find"],
            "returns": ["return", "exchange", "refund", "wrong", "damaged"],
            "support": ["help", "issue", "problem", "support", "contact"],
            "order_placement": ["buy", "purchase", "add cart", "checkout", "order"]
        }
    
    def detect_intent(self, message: str) -> str:
        message_lower = message.lower()
        for intent, keywords in self.intents.items():
            if any(keyword in message_lower for keyword in keywords):
                return intent
        return "general"
    
    async def process_message(self, user_id: str, message: str, conv_id: Optional[str] = None) -> Dict:
        if not conv_id:
            conv_id = self.conversation_manager.create_conversation(user_id)
        
        intent = self.detect_intent(message)
        self.conversation_manager.add_message(conv_id, "user", message)
        
        # AI Response logic
        response = await self.generate_response(intent, message)
        self.conversation_manager.add_message(conv_id, "assistant", response)
        
        suggested_actions = self.get_suggested_actions(intent)
        
        return {
            "response": response,
            "conversation_id": conv_id,
            "timestamp": datetime.now(),
            "intent": intent,
            "suggested_actions": suggested_actions
        }
    
    async def generate_response(self, intent: str, message: str) -> str:
        if self.openai_client:
            completion = await self.openai_client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are UNICK Digital AI Agent, a concise and helpful "
                            "e-commerce assistant. Help with products, orders, "
                            "recommendations, returns, and support."
                        ),
                    },
                    {"role": "user", "content": message},
                ],
                temperature=0.4,
            )
            response = completion.choices[0].message.content
            if response:
                return response

        responses = {
            "order_tracking": "I can help you track your order. Please provide your order ID, and I'll get you the latest status.",
            "product_info": "I'd be happy to help with product information. Which product are you interested in?",
            "recommendation": "Based on your preferences, I have some great recommendations for you!",
            "returns": "I understand you need help with a return or exchange. I'll assist you with that right away.",
            "support": "Our support team is here to help. What's the issue you're facing?",
            "order_placement": "Great! I can help you complete your purchase. What items would you like to order?",
            "general": "How can I assist you with your shopping experience today?"
        }
        return responses.get(intent, "How can I help you?")
    
    def get_suggested_actions(self, intent: str) -> List[str]:
        actions = {
            "order_tracking": ["View Order Status", "Track Shipment", "Contact Support"],
            "product_info": ["View Similar Products", "Add to Cart", "Check Reviews"],
            "recommendation": ["View Recommended Items", "Compare Products", "Add to Wishlist"],
            "returns": ["Initiate Return", "View Return Policy", "Contact Support"],
            "support": ["Chat with Agent", "Email Support", "Call Us"],
            "order_placement": ["Continue Shopping", "Proceed to Checkout", "View Cart"]
        }
        return actions.get(intent, ["Continue Shopping", "Contact Support"])

chatbot_service = ChatbotService()
