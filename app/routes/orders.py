from fastapi import APIRouter, HTTPException
from app.models.schemas import Order, OrderStatus
from app.services.orders import order_service
from datetime import datetime

router = APIRouter()

@router.get("")
async def list_orders():
    """List orders for the operations dashboard."""
    orders = list(order_service.orders.values())
    return {
        "orders": orders,
        "total_orders": len(orders),
        "total_spent": sum(order["total_amount"] for order in orders)
    }

@router.post("/create", response_model=Order)
async def create_order(order: Order):
    """Create a new order"""
    try:
        new_order = order_service.create_order(
            user_id=order.user_id,
            items=order.items,
            total_amount=order.total_amount
        )
        return Order(**new_order)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/status/{order_id}")
async def get_order_status(order_id: str):
    """Get the status of a specific order"""
    order = order_service.get_order_status(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {
        "order_id": order["order_id"],
        "status": order["status"],
        "status_message": order.get("status_message", ""),
        "tracking_number": order.get("tracking_number"),
        "estimated_delivery": order.get("estimated_delivery"),
        "updated_at": order["updated_at"]
    }

@router.get("/user/{user_id}")
async def get_user_orders(user_id: str):
    """Get all orders for a specific user"""
    orders = order_service.get_user_orders(user_id)
    return {
        "user_id": user_id,
        "orders": orders,
        "total_orders": len(orders),
        "total_spent": sum(order["total_amount"] for order in orders)
    }

@router.put("/status/{order_id}")
async def update_order_status(order_id: str, status_update: OrderStatus):
    """Update the status of an order"""
    updated_order = order_service.update_order_status(order_id, status_update.status)
    if not updated_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {
        "order_id": order_id,
        "status": updated_order["status"],
        "message": updated_order.get("status_message"),
        "updated_at": updated_order["updated_at"]
    }

@router.get("/summary/{order_id}")
async def get_order_summary(order_id: str):
    """Get detailed order summary with pricing breakdown"""
    order = order_service.get_order_status(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    summary = order_service.calculate_order_summary(order)
    return {
        "order_id": order_id,
        "items": order["items"],
        "pricing": summary,
        "status": order["status"]
    }

@router.delete("/{order_id}")
async def cancel_order(order_id: str):
    """Cancel an order"""
    updated_order = order_service.update_order_status(order_id, "cancelled")
    if not updated_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {
        "order_id": order_id,
        "status": "cancelled",
        "message": "Your order has been cancelled successfully",
        "timestamp": datetime.now()
    }
