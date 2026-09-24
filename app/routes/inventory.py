from fastapi import APIRouter, HTTPException
from app.models.schemas import Product, InventoryUpdate
from app.services.inventory import inventory_service
from datetime import datetime

router = APIRouter()

@router.get("/products", response_model=list)
async def get_all_products():
    """Get all products in inventory"""
    products = inventory_service.get_all_products()
    return products

@router.get("/product/{product_id}")
async def get_product(product_id: str):
    """Get details of a specific product"""
    product = inventory_service.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product

@router.get("/category/{category}")
async def get_products_by_category(category: str):
    """Get all products in a specific category"""
    products = inventory_service.get_products_by_category(category)
    if not products:
        raise HTTPException(status_code=404, detail=f"No products found in category '{category}'")
    
    return {
        "category": category,
        "products": products,
        "count": len(products)
    }

@router.get("/stock/{product_id}")
async def check_stock(product_id: str, quantity: int = 1):
    """Check if a product is in stock"""
    in_stock = inventory_service.check_stock(product_id, quantity)
    product = inventory_service.get_product(product_id)
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {
        "product_id": product_id,
        "requested_quantity": quantity,
        "available_quantity": product["stock_quantity"],
        "in_stock": in_stock
    }

@router.post("/update-stock")
async def update_stock(update: InventoryUpdate):
    """Update product stock"""
    result = inventory_service.update_stock(
        product_id=update.product_id,
        quantity_change=update.quantity_change,
        reason=update.reason
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return result

@router.get("/low-stock")
async def get_low_stock_products(threshold: int = 20):
    """Get products with low stock levels"""
    products = inventory_service.get_low_stock_products(threshold)
    return {
        "threshold": threshold,
        "low_stock_products": products,
        "count": len(products)
    }

@router.post("/add-product")
async def add_product(product: Product):
    """Add a new product to inventory"""
    new_product = inventory_service.add_product(product.dict())
    return {
        "message": "Product added successfully",
        "product": new_product
    }

@router.get("/inventory-summary")
async def get_inventory_summary():
    """Get overall inventory summary"""
    products = inventory_service.get_all_products()
    total_items = sum(p["stock_quantity"] for p in products)
    total_value = sum(p["stock_quantity"] * p["price"] for p in products)
    
    return {
        "total_products": len(products),
        "total_items_in_stock": total_items,
        "total_inventory_value": round(total_value, 2),
        "categories": list(set(p["category"] for p in products))
    }
