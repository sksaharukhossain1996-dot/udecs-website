from fastapi import APIRouter, HTTPException
from app.models.schemas import Message, ChatResponse
from app.services.chatbot import chatbot_service
from datetime import datetime

router = APIRouter()

@router.post("/send", response_model=ChatResponse)
async def send_message(message: Message):
    """Send a message to the chatbot and get an AI response"""
    try:
        result = await chatbot_service.process_message(
            user_id=message.user_id,
            message=message.message,
            conv_id=message.conversation_id
        )
        
        return ChatResponse(
            response=result["response"],
            conversation_id=result["conversation_id"],
            timestamp=result["timestamp"],
            suggested_actions=result["suggested_actions"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversation/{conv_id}")
async def get_conversation_history(conv_id: str):
    """Get the conversation history for a specific conversation"""
    conversation = chatbot_service.conversation_manager.get_conversation(conv_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {
        "conversation_id": conv_id,
        "messages": conversation,
        "message_count": len(conversation)
    }

@router.post("/create_conversation")
async def create_conversation(user_id: str):
    """Create a new conversation with the chatbot"""
    conv_id = chatbot_service.conversation_manager.create_conversation(user_id)
    return {
        "conversation_id": conv_id,
        "status": "created",
        "user_id": user_id,
        "created_at": datetime.now()
    }

@router.get("/intents")
async def get_available_intents():
    """Get list of available chatbot intents"""
    return {
        "intents": list(chatbot_service.intents.keys()),
        "description": "Chatbot can handle various customer intents"
    }
