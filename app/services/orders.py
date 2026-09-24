from datetime import datetime
import uuid
from typing import Optional, Dict, List

class OrderService:
    def __init__(self):
        self.orders: Dict[str, dict] = {}
    
    def create_order(self, user_id: str, items: list, total_amount: float) -> dict:
        order_id = f"ORD-{str(uuid.uuid4())[:8].upper()}"
        order = {
            "order_id": order_id,
            "user_id": user_id,
            "items": items,
            "total_amount": total_amount,
            "status": "confirmed",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "tracking_number": f"TRK-{str(uuid.uuid4())[:10].upper()}",
            "estimated_delivery": "5-7 business days"
        }
        self.orders[order_id] = order
        return order
    
    def get_order_status(self, order_id: str) -> Optional[dict]:
        return self.orders.get(order_id)
    
    def get_user_orders(self, user_id: str) -> list:
        return [order for order in self.orders.values() if order["user_id"] == user_id]
    
    def update_order_status(self, order_id: str, status: str) -> Optional[dict]:
        if order_id in self.orders:
            self.orders[order_id]["status"] = status
            self.orders[order_id]["updated_at"] = datetime.now()
            
            status_messages = {
                "confirmed": "Your order has been confirmed!",
                "processing": "We're preparing your order for shipment.",
                "shipped": "Your order is on its way!",
                "delivered": "Your order has been delivered!",
                "cancelled": "Your order has been cancelled."
            }
            
            self.orders[order_id]["status_message"] = status_messages.get(status, "Order updated")
            return self.orders[order_id]
        return None
    
    def calculate_order_summary(self, order: dict) -> dict:
        subtotal = order["total_amount"]
        tax = subtotal * 0.1  # 10% tax
        shipping = 5.0 if subtotal > 50 else 10.0
        total = subtotal + tax + shipping
        
        return {
            "subtotal": round(subtotal, 2),
            "tax": round(tax, 2),
            "shipping": round(shipping, 2),
            "total": round(total, 2),
            "currency": "USD"
        }

order_service = OrderService()
