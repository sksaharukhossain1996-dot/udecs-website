from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class PaymentMethodEnum(str, Enum):
    STRIPE = "stripe"
    PAYPAL = "paypal"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"

class PaymentStatusEnum(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class PaymentRequest(BaseModel):
    order_id: str
    amount: float
    currency: str = "USD"
    payment_method: PaymentMethodEnum
    customer_email: str
    customer_name: str
    metadata: Optional[dict] = None

class StripePaymentRequest(BaseModel):
    order_id: str
    amount: float
    currency: str = "USD"
    customer_email: str
    customer_name: str
    description: Optional[str] = None

class PayPalPaymentRequest(BaseModel):
    order_id: str
    amount: float
    currency: str = "USD"
    customer_email: str
    customer_name: str
    return_url: str
    cancel_url: str

class PaymentResponse(BaseModel):
    payment_id: str
    order_id: str
    status: PaymentStatusEnum
    amount: float
    currency: str
    payment_method: PaymentMethodEnum
    created_at: datetime
    transaction_id: Optional[str] = None

class PaymentWebhook(BaseModel):
    event_type: str
    payment_id: str
    order_id: str
    status: PaymentStatusEnum
    amount: Optional[float] = None
    timestamp: datetime

class RefundRequest(BaseModel):
    payment_id: str
    reason: str
    amount: Optional[float] = None

class Invoice(BaseModel):
    invoice_id: str
    order_id: str
    payment_id: str
    amount: float
    tax: float
    total: float
    currency: str = "USD"
    issued_date: datetime
    due_date: Optional[datetime] = None
    status: str = "issued"
    customer_email: str
    items: List[dict]

class TransactionHistory(BaseModel):
    transaction_id: str
    order_id: str
    payment_method: PaymentMethodEnum
    amount: float
    status: PaymentStatusEnum
    created_at: datetime
    completed_at: Optional[datetime] = None
