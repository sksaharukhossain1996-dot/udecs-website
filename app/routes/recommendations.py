from fastapi import APIRouter, HTTPException
from app.services.recommendations import recommendation_service
from typing import List

router = APIRouter()

@router.get("/user/{user_id}")
async def get_user_recommendations(user_id: str, purchase_history: List[str] = None):
    """Get personalized recommendations for a user"""
    recommendations = recommendation_service.get_recommendations_for_user(
        user_id=user_id,
        purchase_history=purchase_history
    )
    
    return {
        "user_id": user_id,
        "recommendations": recommendations,
        "count": len(recommendations),
        "message": "Recommendations based on your purchase history"
    }

@router.get("/trending")
async def get_trending_products():
    """Get trending products"""
    products = recommendation_service.get_trending_products()
    return {
        "category": "trending",
        "products": products,
        "count": len(products)
    }

@router.get("/alternatives/{product_id}")
async def get_product_alternatives(product_id: str):
    """Get alternative products for a given product"""
    alternatives = recommendation_service.get_product_alternatives(product_id)
    
    if not alternatives:
        raise HTTPException(status_code=404, detail="No alternatives found")
    
    return {
        "base_product_id": product_id,
        "alternatives": alternatives,
        "count": len(alternatives)
    }

@router.post("/personalized")
async def get_personalized_recommendations(user_id: str, history: List[str] = None):
    """Get personalized recommendations based on user history"""
    recommendations = recommendation_service.get_recommendations_for_user(
        user_id=user_id,
        purchase_history=history
    )
    
    return {
        "user_id": user_id,
        "recommendations": recommendations,
        "confidence_score": round(sum(r["confidence"] for r in recommendations) / max(len(recommendations), 1), 2)
    }

@router.get("/category/{category}")
async def get_recommendations_by_category(category: str):
    """Get recommendations for a specific category"""
    all_products = recommendation_service.products_db
    category_products = [p for p in all_products.values() if p["category"].lower() == category.lower()]
    
    if not category_products:
        raise HTTPException(status_code=404, detail=f"No products found in category '{category}'")
    
    return {
        "category": category,
        "products": category_products,
        "count": len(category_products)
    }
