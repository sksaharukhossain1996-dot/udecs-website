from typing import Optional, Dict, List
from datetime import datetime

class InventoryService:
    def __init__(self):
        self.inventory: Dict[str, dict] = {
            "PROD-001": {
                "product_id": "PROD-001",
                "name": "Premium Wireless Headphones",
                "category": "Electronics",
                "price": 99.99,
                "stock_quantity": 50,
                "description": "High-quality wireless headphones with noise cancellation",
                "image_url": "https://example.com/headphones.jpg",
                "last_updated": datetime.now()
            },
            "PROD-002": {
                "product_id": "PROD-002",
                "name": "USB-C Cable 2M",
                "category": "Accessories",
                "price": 15.99,
                "stock_quantity": 200,
                "description": "Fast charging USB-C cable",
                "image_url": "https://example.com/cable.jpg",
                "last_updated": datetime.now()
            },
            "PROD-003": {
                "product_id": "PROD-003",
                "name": "Portable Power Bank 20000mAh",
                "category": "Electronics",
                "price": 49.99,
                "stock_quantity": 75,
                "description": "Fast-charging power bank with dual ports",
                "image_url": "https://example.com/powerbank.jpg",
                "last_updated": datetime.now()
            }
        }
    
    def get_product(self, product_id: str) -> Optional[dict]:
        return self.inventory.get(product_id)
    
    def get_all_products(self) -> list:
        return list(self.inventory.values())
    
    def get_products_by_category(self, category: str) -> list:
        return [p for p in self.inventory.values() if p["category"].lower() == category.lower()]
    
    def check_stock(self, product_id: str, quantity: int) -> bool:
        product = self.get_product(product_id)
        return product and product["stock_quantity"] >= quantity
    
    def update_stock(self, product_id: str, quantity_change: int, reason: str = "") -> Optional[dict]:
        if product_id in self.inventory:
            self.inventory[product_id]["stock_quantity"] += quantity_change
            self.inventory[product_id]["last_updated"] = datetime.now()
            
            if quantity_change < 0:
                status = "Stock reduced"
            else:
                status = "Stock replenished"
            
            return {
                "status": status,
                "product_id": product_id,
                "new_quantity": self.inventory[product_id]["stock_quantity"],
                "reason": reason,
                "timestamp": datetime.now()
            }
        return None
    
    def get_low_stock_products(self, threshold: int = 20) -> list:
        return [p for p in self.inventory.values() if p["stock_quantity"] < threshold]
    
    def add_product(self, product: dict) -> dict:
        product_id = product.get("product_id", f"PROD-{len(self.inventory) + 1:03d}")
        product["last_updated"] = datetime.now()
        self.inventory[product_id] = product
        return product

inventory_service = InventoryService()
