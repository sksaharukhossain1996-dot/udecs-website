from typing import List, Dict
import random

class RecommendationService:
    def __init__(self):
        self.category_pairs = {
            "Electronics": ["Accessories", "Electronics"],
            "Accessories": ["Electronics", "Accessories"],
            "Home": ["Home", "Accessories"]
        }
        
        self.products_db = {
            "PROD-001": {"name": "Premium Wireless Headphones", "category": "Electronics", "price": 99.99},
            "PROD-002": {"name": "USB-C Cable 2M", "category": "Accessories", "price": 15.99},
            "PROD-003": {"name": "Portable Power Bank 20000mAh", "category": "Electronics", "price": 49.99},
            "PROD-004": {"name": "Phone Screen Protector", "category": "Accessories", "price": 9.99},
            "PROD-005": {"name": "Wireless Charger Pad", "category": "Electronics", "price": 34.99}
        }
    
    def get_recommendations_for_user(self, user_id: str, purchase_history: List[str] = None) -> List[dict]:
        if not purchase_history:
            return self.get_trending_products()
        
        recommendations = []
        seen_products = set(purchase_history)
        
        for product_id in purchase_history:
            product = self.products_db.get(product_id)
            if product:
                category = product["category"]
                related_categories = self.category_pairs.get(category, [])
                
                for related_product_id, related_product in self.products_db.items():
                    if (related_product_id not in seen_products and 
                        related_product["category"] in related_categories):
                        recommendations.append({
                            "product_id": related_product_id,
                            "product_name": related_product["name"],
                            "reason": f"Recommended based on your purchase of {product['name']}",
                            "confidence": round(random.uniform(0.7, 0.95), 2),
                            "price": related_product["price"]
                        })
                        seen_products.add(related_product_id)
        
        return recommendations[:5]  # Return top 5
    
    def get_trending_products(self) -> List[dict]:
        return [
            {
                "product_id": "PROD-003",
                "product_name": "Portable Power Bank 20000mAh",
                "reason": "Trending this week",
                "confidence": 0.92,
                "price": 49.99
            },
            {
                "product_id": "PROD-001",
                "product_name": "Premium Wireless Headphones",
                "reason": "Most popular item",
                "confidence": 0.89,
                "price": 99.99
            },
            {
                "product_id": "PROD-005",
                "product_name": "Wireless Charger Pad",
                "reason": "New arrival",
                "confidence": 0.85,
                "price": 34.99
            }
        ]
    
    def get_product_alternatives(self, product_id: str, category: str = None) -> List[dict]:
        product = self.products_db.get(product_id)
        if not product:
            return []
        
        target_category = category or product["category"]
        alternatives = []
        
        for pid, prod in self.products_db.items():
            if pid != product_id and prod["category"] == target_category:
                alternatives.append({
                    "product_id": pid,
                    "product_name": prod["name"],
                    "reason": f"Alternative to {product['name']}",
                    "confidence": round(random.uniform(0.7, 0.9), 2),
                    "price": prod["price"]
                })
        
        return alternatives[:3]

recommendation_service = RecommendationService()
