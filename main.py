from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="UNICK Digital AI Agent",
    description="AI-powered e-commerce automation solution",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routes
from app.routes import chatbot, orders, inventory, recommendations, dashboard, payments, whatsapp

# Include routers
app.include_router(chatbot.router, prefix="/api/chatbot", tags=["Chatbot"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(whatsapp.router, prefix="/api/whatsapp", tags=["WhatsApp"])

@app.get("/", include_in_schema=False)
async def root():
    """Serve the customer storefront at the public root URL."""
    return FileResponse("index.html")

@app.get("/dashboard", include_in_schema=False)
async def dashboard():
    """Serve the browser dashboard without changing the API root contract."""
    return FileResponse("admin.html")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "UNICK Digital AI Agent"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
