from fastapi import APIRouter, HTTPException
from app.models.payment_schemas import (
    PaymentRequest, StripePaymentRequest, PayPalPaymentRequest,
    RefundRequest, PaymentResponse
)
from app.services.payments import payment_service
from datetime import datetime

router = APIRouter()

@router.post("/create")
async def create_payment(payment_req: PaymentRequest):
    """Create a new payment request"""
    try:
        payment = payment_service.create_payment(
            order_id=payment_req.order_id,
            amount=payment_req.amount,
            currency=payment_req.currency,
            payment_method=payment_req.payment_method,
            customer_email=payment_req.customer_email,
            customer_name=payment_req.customer_name
        )
        
        return {
            "payment_id": payment["payment_id"],
            "order_id": payment["order_id"],
            "amount": payment["amount"],
            "currency": payment["currency"],
            "status": payment["status"],
            "created_at": payment["created_at"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/stripe/charge")
async def charge_stripe(stripe_req: StripePaymentRequest, stripe_token: str):
    """Process payment via Stripe"""
    try:
        # Create payment record
        payment = payment_service.create_payment(
            order_id=stripe_req.order_id,
            amount=stripe_req.amount,
            currency=stripe_req.currency,
            payment_method="stripe",
            customer_email=stripe_req.customer_email,
            customer_name=stripe_req.customer_name
        )
        
        # Process payment
        result = payment_service.process_stripe_payment(payment["payment_id"], stripe_token)
        
        return {
            "status": result["status"],
            "payment_id": result["payment_id"],
            "transaction_id": result["transaction_id"],
            "receipt_url": result["receipt_url"],
            "amount": stripe_req.amount,
            "currency": stripe_req.currency
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/paypal/charge")
async def charge_paypal(paypal_req: PayPalPaymentRequest, paypal_token: str):
    """Process payment via PayPal"""
    try:
        # Create payment record
        payment = payment_service.create_payment(
            order_id=paypal_req.order_id,
            amount=paypal_req.amount,
            currency=paypal_req.currency,
            payment_method="paypal",
            customer_email=paypal_req.customer_email,
            customer_name=paypal_req.customer_name
        )
        
        # Process payment
        result = payment_service.process_paypal_payment(payment["payment_id"], paypal_token)
        
        return {
            "status": result["status"],
            "payment_id": result["payment_id"],
            "transaction_id": result["transaction_id"],
            "receipt_url": result["receipt_url"],
            "amount": paypal_req.amount,
            "currency": paypal_req.currency
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/status/{payment_id}")
async def get_payment_status(payment_id: str):
    """Get payment status"""
    payment = payment_service.get_payment(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {
        "payment_id": payment["payment_id"],
        "order_id": payment["order_id"],
        "amount": payment["amount"],
        "currency": payment["currency"],
        "status": payment["status"],
        "payment_method": payment["payment_method"],
        "transaction_id": payment["transaction_id"],
        "created_at": payment["created_at"],
        "updated_at": payment["updated_at"]
    }

@router.get("/order/{order_id}")
async def get_payment_by_order(order_id: str):
    """Get payment information for an order"""
    payment = payment_service.get_payment_by_order(order_id)
    if not payment:
        raise HTTPException(status_code=404, detail="No payment found for this order")
    
    return {
        "payment_id": payment["payment_id"],
        "order_id": payment["order_id"],
        "amount": payment["amount"],
        "currency": payment["currency"],
        "status": payment["status"],
        "payment_method": payment["payment_method"]
    }

@router.post("/refund")
async def refund_payment(refund_req: RefundRequest):
    """Process refund for a payment"""
    try:
        refund = payment_service.refund_payment(
            payment_id=refund_req.payment_id,
            reason=refund_req.reason,
            amount=refund_req.amount
        )
        
        if "error" in refund.get("status", ""):
            raise HTTPException(status_code=400, detail=refund.get("message"))
        
        return {
            "refund_id": refund["refund_id"],
            "payment_id": refund["payment_id"],
            "order_id": refund["order_id"],
            "amount": refund["amount"],
            "reason": refund["reason"],
            "status": refund["status"],
            "created_at": refund["created_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/invoice/{invoice_id}")
async def get_invoice(invoice_id: str):
    """Get invoice details"""
    invoice = payment_service.get_invoice(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return invoice

@router.get("/invoices/{order_id}")
async def get_order_invoices(order_id: str):
    """Get all invoices for an order"""
    invoices = payment_service.get_invoices_by_order(order_id)
    return {
        "order_id": order_id,
        "invoices": invoices,
        "count": len(invoices)
    }

@router.get("/transactions/{order_id}")
async def get_order_transactions(order_id: str):
    """Get transaction history for an order"""
    transactions = payment_service.get_transaction_history(order_id)
    return {
        "order_id": order_id,
        "transactions": transactions,
        "count": len(transactions)
    }

@router.post("/webhook")
async def payment_webhook(event_type: str, payment_id: str, status: str):
    """Handle payment gateway webhooks (Stripe, PayPal, etc.)"""
    try:
        result = payment_service.handle_webhook(event_type, payment_id, status)
        
        if "error" in result.get("status", ""):
            raise HTTPException(status_code=404, detail=result.get("message"))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/methods")
async def get_payment_methods():
    """Get available payment methods"""
    return {
        "methods": [
            {
                "name": "Stripe",
                "type": "stripe",
                "supported_cards": ["Visa", "Mastercard", "American Express"],
                "status": "active"
            },
            {
                "name": "PayPal",
                "type": "paypal",
                "supported": ["PayPal Balance", "Credit Card", "Bank Account"],
                "status": "active"
            }
        ]
    }
