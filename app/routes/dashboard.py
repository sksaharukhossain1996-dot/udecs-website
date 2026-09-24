from fastapi import APIRouter
from datetime import datetime, timedelta
from app.services.orders import order_service
from app.services.inventory import inventory_service

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats():
    """Get overall dashboard statistics"""
    orders = order_service.orders
    products = inventory_service.get_all_products()
    
    total_orders = len(orders)
    total_revenue = sum(order["total_amount"] for order in orders.values())
    total_products = len(products)
    total_inventory_value = sum(p["stock_quantity"] * p["price"] for p in products)
    
    return {
        "timestamp": datetime.now(),
        "orders": {
            "total": total_orders,
            "total_revenue": round(total_revenue, 2),
            "average_order_value": round(total_revenue / max(total_orders, 1), 2)
        },
        "inventory": {
            "total_products": total_products,
            "total_items": sum(p["stock_quantity"] for p in products),
            "total_value": round(total_inventory_value, 2)
        }
    }

@router.get("/orders-status")
async def get_orders_by_status():
    """Get orders grouped by status"""
    orders = order_service.orders
    status_breakdown = {}
    
    for order in orders.values():
        status = order["status"]
        if status not in status_breakdown:
            status_breakdown[status] = 0
        status_breakdown[status] += 1
    
    return {
        "status_breakdown": status_breakdown,
        "total_orders": len(orders)
    }

@router.get("/top-products")
async def get_top_products():
    """Get top-performing products"""
    products = inventory_service.get_all_products()
    top_products = sorted(products, key=lambda x: x["price"], reverse=True)[:5]
    
    return {
        "top_products": top_products,
        "count": len(top_products)
    }

@router.get("/revenue-summary")
async def get_revenue_summary():
    """Get revenue summary"""
    orders = order_service.orders
    
    if not orders:
        return {
            "total_revenue": 0,
            "order_count": 0,
            "average_order_value": 0
        }
    
    total_revenue = sum(order["total_amount"] for order in orders.values())
    
    return {
        "total_revenue": round(total_revenue, 2),
        "order_count": len(orders),
        "average_order_value": round(total_revenue / len(orders), 2),
        "currency": "USD"
    }

@router.get("/sales-analytics")
async def get_sales_analytics():
    """Return lightweight chart data derived from the in-memory order store."""
    orders = list(order_service.orders.values())
    by_day = {}
    by_status = {}
    for order in orders:
        date_key = order["created_at"].strftime("%b %d")
        by_day[date_key] = round(by_day.get(date_key, 0) + order["total_amount"], 2)
        by_status[order["status"]] = by_status.get(order["status"], 0) + 1

    return {
        "revenue_by_day": [{"label": label, "value": value} for label, value in by_day.items()],
        "orders_by_status": [{"label": label, "value": value} for label, value in by_status.items()]
    }

@router.get("/performance")
async def get_performance_metrics():
    """Get performance metrics for the business"""
    orders = order_service.orders
    products = inventory_service.get_all_products()
    
    return {
        "business_name": "UNICK DIGITAL E-COMMERCE SOLUTION",
        "metrics": {
            "total_orders_processed": len(orders),
            "total_products": len(products),
            "low_stock_alerts": len(inventory_service.get_low_stock_products()),
            "system_status": "operational",
            "last_updated": datetime.now()
        },
        "ai_agent_status": {
            "chatbot": "active",
            "automation": "running",
            "recommendations_engine": "active"
        }
    }

@router.get("/business-info")
async def get_business_info():
    """Get business information"""
    return {
        "business_name": "UNICK DIGITAL E-COMMERCE SOLUTION",
        "business_type": "E-Commerce Automation Solution",
        "features": [
            "AI-powered Chatbot",
            "Order Processing Automation",
            "Inventory Management",
            "Product Recommendations",
            "Customer Analytics"
        ],
        "api_version": "1.0.0",
        "status": "operational"
    }
