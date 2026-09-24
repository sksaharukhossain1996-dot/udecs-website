from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Message(BaseModel):
    user_id: str
    message: str
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    timestamp: datetime
    suggested_actions: Optional[List[str]] = None

class Order(BaseModel):
    order_id: Optional[str] = None
    user_id: str
    items: List[dict]
    total_amount: float
    status: str = "pending"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class OrderStatus(BaseModel):
    order_id: str
    status: str
    updated_at: datetime

class Product(BaseModel):
    product_id: str
    name: str
    description: str
    price: float
    stock_quantity: int
    category: str
    image_url: Optional[str] = None

class InventoryUpdate(BaseModel):
    product_id: str
    quantity_change: int
    reason: str

class Recommendation(BaseModel):
    product_id: str
    product_name: str
    reason: str
    confidence: float
    price: float

class CustomerProfile(BaseModel):
    user_id: str
    name: str
    email: str
    purchase_history: Optional[List[str]] = None
    preferences: Optional[dict] = None
