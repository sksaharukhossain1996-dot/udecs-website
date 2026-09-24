import uuid
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from app.models.payment_schemas import PaymentStatusEnum, PaymentMethodEnum

try:
    import stripe
except ImportError:
    stripe = None

class PaymentService:
    def __init__(self):
        self.payments: Dict[str, dict] = {}
        self.invoices: Dict[str, dict] = {}
        self.transactions: Dict[str, dict] = {}
        self.refunds: Dict[str, dict] = {}
        
        self.stripe_key = os.getenv("STRIPE_API_KEY")
        self.paypal_client_id = os.getenv("PAYPAL_CLIENT_ID")
        self.paypal_secret = os.getenv("PAYPAL_SECRET")
        if stripe and self.stripe_key and not self.stripe_key.startswith("sk_test_your_"):
            stripe.api_key = self.stripe_key
    
    def set_stripe_key(self, key: str):
        """Set Stripe API key"""
        self.stripe_key = key
    
    def set_paypal_credentials(self, client_id: str, secret: str):
        """Set PayPal credentials"""
        self.paypal_client_id = client_id
        self.paypal_secret = secret
    
    def create_payment(self, order_id: str, amount: float, currency: str, 
                      payment_method: str, customer_email: str, customer_name: str) -> dict:
        """Create a new payment record"""
        payment_id = f"PAY-{str(uuid.uuid4())[:8].upper()}"
        
        payment = {
            "payment_id": payment_id,
            "order_id": order_id,
            "amount": amount,
            "currency": currency,
            "payment_method": payment_method,
            "customer_email": customer_email,
            "customer_name": customer_name,
            "status": "pending",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "transaction_id": None,
            "provider_payment_id": None,
            "receipt_url": None
        }
        
        self.payments[payment_id] = payment
        return payment
    
    def process_stripe_payment(self, payment_id: str, stripe_token: str) -> dict:
        """Confirm a Stripe PaymentIntent using a client-created payment method."""
        if payment_id not in self.payments:
            return {"status": "error", "message": "Payment not found"}
        if not self.stripe_key or self.stripe_key.startswith("sk_test_your_"):
            return {"status": "error", "message": "Stripe API key is not configured"}
        if stripe is None:
            return {"status": "error", "message": "Stripe SDK is not installed"}

        payment = self.payments[payment_id]
        try:
            intent = stripe.PaymentIntent.create(
                amount=round(payment["amount"] * 100),
                currency=payment["currency"].lower(),
                payment_method=stripe_token,
                confirm=True,
                description=f"UNICK order {payment['order_id']}",
                receipt_email=payment["customer_email"],
                automatic_payment_methods={
                    "enabled": True,
                    "allow_redirects": "never",
                },
            )
        except stripe.error.StripeError as exc:
            payment["status"] = "failed"
            payment["updated_at"] = datetime.now()
            return {"status": "error", "message": str(exc)}

        if intent.status != "succeeded":
            payment["status"] = "processing"
            payment["updated_at"] = datetime.now()
            return {
                "status": intent.status,
                "payment_id": payment_id,
                "transaction_id": intent.id,
                "receipt_url": None,
            }

        transaction_id = intent.id

        payment["status"] = "completed"
        payment["transaction_id"] = transaction_id
        payment["provider_payment_id"] = intent.id
        payment["receipt_url"] = None
        payment["updated_at"] = datetime.now()
        
        # Record transaction
        self._record_transaction(payment, transaction_id)
        
        # Generate invoice
        self._generate_invoice(payment)
        
        return {
            "status": "completed",
            "payment_id": payment_id,
            "transaction_id": transaction_id,
            "receipt_url": payment["receipt_url"]
        }
    
    def process_paypal_payment(self, payment_id: str, paypal_token: str) -> dict:
        """Process payment via PayPal (mock implementation)"""
        if payment_id not in self.payments:
            return {"status": "error", "message": "Payment not found"}
        
        payment = self.payments[payment_id]
        
        # Mock PayPal processing
        transaction_id = f"paypal_{str(uuid.uuid4())[:12]}"
        
        payment["status"] = "completed"
        payment["transaction_id"] = transaction_id
        payment["receipt_url"] = f"https://paypal.com/receipt/{transaction_id}"
        payment["updated_at"] = datetime.now()
        
        # Record transaction
        self._record_transaction(payment, transaction_id)
        
        # Generate invoice
        self._generate_invoice(payment)
        
        return {
            "status": "completed",
            "payment_id": payment_id,
            "transaction_id": transaction_id,
            "receipt_url": payment["receipt_url"]
        }
    
    def _record_transaction(self, payment: dict, transaction_id: str):
        """Record transaction in history"""
        trans = {
            "transaction_id": transaction_id,
            "order_id": payment["order_id"],
            "payment_method": payment["payment_method"],
            "amount": payment["amount"],
            "status": "completed",
            "created_at": datetime.now(),
            "completed_at": datetime.now(),
            "currency": payment["currency"]
        }
        self.transactions[transaction_id] = trans
    
    def _generate_invoice(self, payment: dict):
        """Generate invoice for payment"""
        invoice_id = f"INV-{str(uuid.uuid4())[:8].upper()}"
        
        tax = payment["amount"] * 0.1  # 10% tax
        total = payment["amount"] + tax
        
        invoice = {
            "invoice_id": invoice_id,
            "order_id": payment["order_id"],
            "payment_id": payment["payment_id"],
            "amount": payment["amount"],
            "tax": tax,
            "total": total,
            "currency": payment["currency"],
            "issued_date": datetime.now(),
            "due_date": datetime.now() + timedelta(days=30),
            "status": "issued",
            "customer_email": payment["customer_email"],
            "items": []
        }
        
        self.invoices[invoice_id] = invoice
        return invoice
    
    def get_payment(self, payment_id: str) -> Optional[dict]:
        """Get payment details"""
        return self.payments.get(payment_id)
    
    def get_payment_by_order(self, order_id: str) -> Optional[dict]:
        """Get payment by order ID"""
        for payment in self.payments.values():
            if payment["order_id"] == order_id:
                return payment
        return None
    
    def refund_payment(self, payment_id: str, reason: str = "", amount: Optional[float] = None) -> dict:
        """Process refund"""
        if payment_id not in self.payments:
            return {"status": "error", "message": "Payment not found"}
        
        payment = self.payments[payment_id]
        refund_amount = amount or payment["amount"]
        
        if refund_amount > payment["amount"]:
            return {"status": "error", "message": "Refund amount exceeds payment amount"}

        if payment["payment_method"] == "stripe":
            if not payment.get("provider_payment_id"):
                return {"status": "error", "message": "Stripe payment reference is missing"}
            if stripe is None:
                return {"status": "error", "message": "Stripe SDK is not installed"}
            try:
                stripe_refund = stripe.Refund.create(
                    payment_intent=payment["provider_payment_id"],
                    amount=round(refund_amount * 100),
                    reason="requested_by_customer" if reason else None,
                )
            except stripe.error.StripeError as exc:
                return {"status": "error", "message": str(exc)}
            if stripe_refund.status != "succeeded":
                return {
                    "status": "error",
                    "message": f"Stripe refund status: {stripe_refund.status}",
                }
        
        refund_id = f"REF-{str(uuid.uuid4())[:8].upper()}"
        
        refund = {
            "refund_id": refund_id,
            "payment_id": payment_id,
            "order_id": payment["order_id"],
            "amount": refund_amount,
            "reason": reason,
            "status": "completed",
            "created_at": datetime.now()
        }
        
        self.refunds[refund_id] = refund
        payment["status"] = "refunded"
        payment["updated_at"] = datetime.now()
        
        return refund
    
    def get_invoice(self, invoice_id: str) -> Optional[dict]:
        """Get invoice details"""
        return self.invoices.get(invoice_id)
    
    def get_invoices_by_order(self, order_id: str) -> list:
        """Get all invoices for an order"""
        return [inv for inv in self.invoices.values() if inv["order_id"] == order_id]
    
    def get_transaction_history(self, order_id: str) -> list:
        """Get transaction history for an order"""
        return [trans for trans in self.transactions.values() if trans["order_id"] == order_id]
    
    def handle_webhook(self, event_type: str, payment_id: str, status: str) -> dict:
        """Handle payment gateway webhooks"""
        if payment_id not in self.payments:
            return {"status": "error", "message": "Payment not found"}
        
        payment = self.payments[payment_id]
        payment["status"] = status
        payment["updated_at"] = datetime.now()
        
        return {
            "status": "webhook_processed",
            "payment_id": payment_id,
            "event_type": event_type,
            "new_status": status
        }

payment_service = PaymentService()
