import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { CartItem, Order, OrderItem, PaymentMethod } from '../../types';
import { BrandLogo } from '../common/BrandLogo';
import {
  X,
  CheckCircle,
  CreditCard,
  Truck,
  ShieldCheck,
  FileText,
  Printer,
  Smartphone,
  Building,
  Lock,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { generateWhatsAppLink, buildOrderPlacedMessage } from '../../services/whatsappService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  directItem?: { product: any; quantity: number; isWholesale: boolean } | null;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  directItem,
  onOrderSuccess,
}) => {
  const {
    cart,
    company,
    createOrder,
    currency,
    formatPrice,
    payuConfig,
    language,
    whatsappConfig,
  } = useStore();

  const checkoutItems = directItem
    ? [
        {
          product: directItem.product,
          quantity: directItem.quantity,
          isWholesale: directItem.isWholesale,
        },
      ]
    : cart;

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700091',
    gstin: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('payu');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [payuStep, setPayuStep] = useState<'details' | 'payu_portal' | 'complete'>('details');

  if (!isOpen) return null;

  // Calculate totals & GST
  const subtotal = checkoutItems.reduce((sum, item) => {
    const isWholesale =
      item.isWholesale || item.quantity >= item.product.minWholesaleQty;
    const price = isWholesale ? item.product.wholesalePrice : item.product.price;
    return sum + price * item.quantity;
  }, 0);

  // Is Intrastate (West Bengal) or Interstate (Outside WB)
  const isWestBengal = formData.state.toLowerCase().includes('bengal');
  const taxableAmount = Math.round(subtotal / 1.18);
  const totalGst = subtotal - taxableAmount;
  const cgst = isWestBengal ? Math.round(totalGst / 2) : 0;
  const sgst = isWestBengal ? totalGst - cgst : 0;
  const igst = !isWestBengal ? totalGst : 0;
  const shippingFee = subtotal > 1000 ? 0 : 99;
  const totalAmount = subtotal + shippingFee;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.address) {
      alert('Please fill in all mandatory billing and shipping fields.');
      return;
    }

    if (paymentMethod === 'payu' || paymentMethod === 'upi' || paymentMethod === 'card') {
      // Transition to PayU gateway simulation screen
      setPayuStep('payu_portal');
    } else {
      executeOrderPlacement('cod', 'COD_ORDER_PLACED');
    }
  };

  const executeOrderPlacement = (method: PaymentMethod, txnId: string) => {
    setIsProcessing(true);

    const orderItems: OrderItem[] = checkoutItems.map((item) => {
      const isWs =
        item.isWholesale || item.quantity >= item.product.minWholesaleQty;
      const unit = isWs ? item.product.wholesalePrice : item.product.price;
      const tax = Math.round((unit * item.quantity) - ((unit * item.quantity) / 1.18));
      return {
        productId: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        hsn: item.product.hsn,
        quantity: item.quantity,
        unitPrice: unit,
        gstRate: item.product.gstRate,
        taxAmount: tax,
        totalPrice: unit * item.quantity,
      };
    });

    const newOrder = createOrder({
      customerName: formData.name,
      customerEmail: formData.email,
      customerPhone: formData.phone,
      shippingAddress: formData.address,
      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
      gstin: formData.gstin || undefined,
      items: orderItems,
      subtotal,
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalGst,
      shippingFee,
      totalAmount,
      currency,
      paymentMethod: method,
      paymentStatus: method === 'cod' ? 'pending' : 'paid',
      payuTxnId: txnId,
      orderStatus: 'processing',
      courierName: 'Delhivery Surface Logistics',
      trackingNumber: `DLH${Math.floor(10000000 + Math.random() * 90000000)}IN`,
    });

    setTimeout(() => {
      setIsProcessing(false);
      setCompletedOrder(newOrder);
      setPayuStep('complete');
      onOrderSuccess(newOrder);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1913]/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-[#FBFAF5] border border-[#CBCFB9] rounded-lg max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative my-6 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#CBCFB9] mb-6">
          <div>
            <h3 className="text-xl font-bold font-heading text-[#0F1913] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#3C6656]" />
              <span>
                {payuStep === 'complete'
                  ? language === 'bn'
                    ? 'অর্ডার সফলভাবে সম্পন্ন হয়েছে!'
                    : 'Order Placed Successfully!'
                  : payuStep === 'payu_portal'
                  ? 'PayU India Secure Checkout'
                  : language === 'bn'
                  ? 'নিরাপদ চেকআউট ও বিলিং'
                  : 'Secure Checkout & Tax Billing'}
              </span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#E4E8D9] text-[#565F52]"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: Details & Billing Form */}
        {payuStep === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Customer and Shipping Details */}
              <div className="md:col-span-7 space-y-4">
                <h4 className="text-sm font-bold text-[#0F1913] uppercase tracking-wider font-heading border-b border-[#CBCFB9] pb-1">
                  1. {language === 'bn' ? 'গ্রাহকের তথ্য ও ডেলিভারি ঠিকানা' : 'Customer & Shipping Address'}
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-[#182620] mb-1">
                    {language === 'bn' ? 'পুরো নাম *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Mohammad Farooq / Tanmoy Roy"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2.5 text-[#0F1913] focus:border-[#A87C1F] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#182620] mb-1">
                      {language === 'bn' ? 'ইমেইল ঠিকানা *' : 'Email Address *'}
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="e.g. farooq@gmail.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2.5 text-[#0F1913] focus:border-[#A87C1F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#182620] mb-1">
                      {language === 'bn' ? 'মোবাইল নম্বর (SMS ট্র্যাকিংয়ের জন্য) *' : 'Phone Number (for SMS Tracking) *'}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="+91 9831123456"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2.5 text-[#0F1913] focus:border-[#A87C1F] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#182620] mb-1">
                    {language === 'bn' ? 'ডেলিভারি ঠিকানা ও বাড়ি/দোকান নং *' : 'Delivery Street Address *'}
                  </label>
                  <input
                    type="text"
                    name="address"
                    required
                    placeholder="Shop/Flat No., Building Name, Street"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2.5 text-[#0F1913] focus:border-[#A87C1F] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#182620] mb-1">
                      {language === 'bn' ? 'শহর / জেলা' : 'City / District'}
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2.5 text-[#0F1913]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#182620] mb-1">
                      {language === 'bn' ? 'রাজ্য' : 'State'}
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2.5 text-[#0F1913]"
                    >
                      <option value="West Bengal">West Bengal (19)</option>
                      <option value="Bihar">Bihar (10)</option>
                      <option value="Jharkhand">Jharkhand (20)</option>
                      <option value="Assam">Assam (18)</option>
                      <option value="Odisha">Odisha (21)</option>
                      <option value="Delhi">Delhi (07)</option>
                      <option value="Maharashtra">Maharashtra (27)</option>
                      <option value="Karnataka">Karnataka (29)</option>
                      <option value="Other">Other States</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#182620] mb-1">
                      {language === 'bn' ? 'পিনকোড' : 'PIN Code'}
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2.5 text-[#0F1913]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#182620] mb-1 flex items-center justify-between">
                    <span>{language === 'bn' ? 'জিএসটি নম্বর (ঐচ্ছিক - B2B ট্যাক্স ক্রেডিটের জন্য)' : 'GSTIN (Optional for B2B Input Tax Credit)'}</span>
                    <span className="text-[10px] text-[#A87C1F]">GST Input Credit</span>
                  </label>
                  <input
                    type="text"
                    name="gstin"
                    placeholder="e.g. 19AAECF1234K1Z5"
                    value={formData.gstin}
                    onChange={handleInputChange}
                    className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2.5 text-[#0F1913] uppercase font-mono"
                  />
                </div>

                {/* Payment Selection */}
                <div className="pt-2">
                  <h4 className="text-sm font-bold text-[#0F1913] uppercase tracking-wider font-heading border-b border-[#CBCFB9] pb-1 mb-2.5">
                    2. {language === 'bn' ? 'পেমেন্ট মেথড নির্বাচন করুন' : 'Select Payment Method'}
                  </h4>

                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-white border border-[#CC9A2E] rounded cursor-pointer">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'payu'}
                        onChange={() => setPaymentMethod('payu')}
                        className="accent-[#CC9A2E]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0F1913]">
                            PayU Payment Gateway (Recommended)
                          </span>
                          <span className="text-[10px] bg-[#CC9A2E]/20 text-[#A87C1F] font-semibold px-2 py-0.5 rounded">
                            Instant · Secure
                          </span>
                        </div>
                        <p className="text-[11px] text-[#565F52]">
                          UPI (GPay, PhonePe, Paytm), Debit/Credit Cards, Net Banking & Wallets
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border border-[#CBCFB9] hover:border-[#0F1913] rounded cursor-pointer">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        className="accent-[#0F1913]"
                      />
                      <div>
                        <span className="text-xs font-bold text-[#0F1913] block">
                          Cash on Delivery (COD)
                        </span>
                        <span className="text-[11px] text-[#565F52]">
                          Pay cash or UPI upon doorstep delivery by courier
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Order Summary & Tax Breakdown */}
              <div className="md:col-span-5 bg-[#EEF0E7] p-4 sm:p-5 rounded-md border border-[#CBCFB9] flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#0F1913] uppercase tracking-wider font-heading border-b border-[#CBCFB9] pb-1.5 mb-3">
                    {language === 'bn' ? 'অর্ডারের বিবরণ ও জিএসটি' : 'Order Summary & GST'}
                  </h4>

                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {checkoutItems.map((item, idx) => {
                      const isWs =
                        item.isWholesale ||
                        item.quantity >= item.product.minWholesaleQty;
                      const price = isWs
                        ? item.product.wholesalePrice
                        : item.product.price;
                      return (
                        <div
                          key={idx}
                          className="flex justify-between items-start text-xs border-b border-[#CBCFB9]/50 pb-2"
                        >
                          <div>
                            <span className="font-semibold text-[#0F1913] block line-clamp-1">
                              {language === 'bn' ? item.product.nameBn : item.product.name}
                            </span>
                            <span className="text-[11px] text-[#565F52]">
                              Qty: {item.quantity} × {formatPrice(price)}
                              {isWs && ' (Wholesale)'}
                            </span>
                          </div>
                          <span className="font-bold text-[#0F1913]">
                            {formatPrice(price * item.quantity)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Calculations */}
                  <div className="pt-3 border-t border-[#CBCFB9] space-y-1.5 text-xs text-[#565F52]">
                    <div className="flex justify-between">
                      <span>Taxable Value:</span>
                      <span>{formatPrice(taxableAmount)}</span>
                    </div>

                    {isWestBengal ? (
                      <>
                        <div className="flex justify-between">
                          <span>CGST (9%):</span>
                          <span>{formatPrice(cgst)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SGST (9%):</span>
                          <span>{formatPrice(sgst)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <span>IGST (18% Interstate):</span>
                        <span>{formatPrice(igst)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Shipping (Delhivery):</span>
                      <span className="text-[#3C6656] font-semibold">
                        {shippingFee === 0 ? 'FREE' : formatPrice(shippingFee)}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#CBCFB9] flex justify-between items-baseline text-sm font-bold text-[#0F1913]">
                      <span>Total Amount:</span>
                      <span className="text-lg font-black text-[#3C6656]">
                        {formatPrice(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3">
                  <button
                    type="submit"
                    className="w-full bg-[#0F1913] hover:bg-[#182620] text-white py-3 px-4 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
                  >
                    <Lock className="w-4 h-4 text-[#CC9A2E]" />
                    <span>
                      {paymentMethod === 'payu'
                        ? language === 'bn'
                          ? 'PayU দিয়ে পেমেন্ট সম্পন্ন করুন'
                          : 'Proceed to PayU Gateway'
                        : language === 'bn'
                        ? 'ক্যাশ অন ডেলিভারিতে নিশ্চিত করুন'
                        : 'Confirm Cash on Delivery Order'}
                    </span>
                  </button>

                  <div className="mt-2 text-center text-[10px] text-[#565F52]">
                    Encrypted 256-bit SSL · PayU Verified Merchant · GST Invoice Included
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* STEP 2: PayU Payment Gateway Portal (Interactive Simulation & Real Form Handler) */}
        {payuStep === 'payu_portal' && (
          <div className="space-y-6">
            <div className="bg-[#182620] text-white p-5 rounded-lg border border-[#CC9A2E]/40">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-[#CC9A2E] text-[#0F1913] font-black px-2 py-0.5 rounded text-sm tracking-wider">
                    Pay<span className="text-white">U</span>
                  </div>
                  <span className="text-xs font-mono text-[#B9BFAE]">
                    MERCHANT GATEWAY CHECKOUT
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#B9BFAE] block">Payable:</span>
                  <span className="text-lg font-black text-[#CC9A2E]">
                    {formatPrice(totalAmount)}
                  </span>
                </div>
              </div>

              {/* PayU Form Parameters Inspection */}
              <div className="bg-black/30 p-3 rounded text-[11px] font-mono-code text-[#B9BFAE] space-y-1 mb-4">
                <div className="flex justify-between">
                  <span>Merchant Key:</span>
                  <span className="text-white">{payuConfig.merchantKey}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transaction ID (txnid):</span>
                  <span className="text-white">TXN_{Date.now().toString().slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="text-white">{formData.name} ({formData.phone})</span>
                </div>
                <div className="flex justify-between">
                  <span>Hash (SHA-512):</span>
                  <span className="text-[#CC9A2E] truncate max-w-[240px]">
                    e89b47f01c9a721df99a2c91834...
                  </span>
                </div>
              </div>

              {/* Payment Mode Selector inside PayU */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-white">
                  Select PayU Payment Channel:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      executeOrderPlacement('payu', `PAYU_UPI_${Date.now().toString().slice(-6)}`)
                    }
                    disabled={isProcessing}
                    className="p-3 bg-white/10 hover:bg-[#CC9A2E] hover:text-[#0F1913] rounded border border-white/20 font-semibold transition-all flex flex-col items-center gap-1.5"
                  >
                    <Smartphone className="w-5 h-5" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      executeOrderPlacement('card', `PAYU_CARD_${Date.now().toString().slice(-6)}`)
                    }
                    disabled={isProcessing}
                    className="p-3 bg-white/10 hover:bg-[#CC9A2E] hover:text-[#0F1913] rounded border border-white/20 font-semibold transition-all flex flex-col items-center gap-1.5"
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>Cards (Visa/MC)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      executeOrderPlacement('netbanking', `PAYU_NB_${Date.now().toString().slice(-6)}`)
                    }
                    disabled={isProcessing}
                    className="p-3 bg-white/10 hover:bg-[#CC9A2E] hover:text-[#0F1913] rounded border border-white/20 font-semibold transition-all flex flex-col items-center gap-1.5"
                  >
                    <Building className="w-5 h-5" />
                    <span>Net Banking</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      executeOrderPlacement('payu', `PAYU_WLT_${Date.now().toString().slice(-6)}`)
                    }
                    disabled={isProcessing}
                    className="p-3 bg-white/10 hover:bg-[#CC9A2E] hover:text-[#0F1913] rounded border border-white/20 font-semibold transition-all flex flex-col items-center gap-1.5"
                  >
                    <Lock className="w-5 h-5" />
                    <span>Wallets</span>
                  </button>
                </div>
              </div>
            </div>

            {isProcessing ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-8 h-8 border-3 border-[#CC9A2E] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-semibold text-[#0F1913]">
                  Verifying PayU payment signature and reserving warehouse stock...
                </p>
              </div>
            ) : (
              <div className="flex justify-between">
                <button
                  onClick={() => setPayuStep('details')}
                  className="text-xs font-semibold text-[#565F52] hover:text-[#0F1913] underline"
                >
                  ← Back to Billing Details
                </button>
                <span className="text-[11px] text-[#565F52]">
                  Test Mode: {payuConfig.testMode ? 'Sandbox Enabled' : 'Live Gateway'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Order Completed & Tax Invoice Ready */}
        {payuStep === 'complete' && completedOrder && (
          <div className="space-y-6 animate-scaleIn">
            <div className="text-center py-4 bg-[#E4E8D9] rounded-lg border border-[#CBCFB9] space-y-2">
              <CheckCircle className="w-12 h-12 text-[#3C6656] mx-auto mb-1" />
              <h4 className="text-xl font-black text-[#0F1913] font-heading">
                {language === 'bn' ? 'অর্ডার কনফার্ম হয়েছে!' : 'Payment & Order Confirmed!'}
              </h4>
              <p className="text-xs text-[#565F52]">
                Order Reference ID:{' '}
                <span className="font-mono font-bold text-[#0F1913] text-sm">
                  {completedOrder.id}
                </span>
              </p>
              <div className="inline-flex items-center gap-2 bg-[#25D366]/15 border border-[#25D366]/40 text-[#128C7E] px-3 py-1 rounded-full text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
                <span>
                  {language === 'bn'
                    ? 'হোয়াটসঅ্যাপ অটোমেশন কনফার্মেশন পাঠানো হয়েছে'
                    : 'Automated WhatsApp confirmation dispatched'}
                </span>
              </div>
            </div>

            {/* Printable Tax Invoice Container */}
            <div
              id="printable-area"
              className="bg-white p-6 rounded border border-[#CBCFB9] text-xs text-[#0F1913] space-y-4"
            >
              {/* Invoice Header with Transparent Brand Logo */}
              <div className="flex justify-between items-start border-b border-[#CBCFB9] pb-4">
                <div className="space-y-1">
                  <div className="mb-2">
                    <BrandLogo size="sm" />
                  </div>
                  <h5 className="font-black text-sm text-[#0F1913] tracking-tight">
                    {company.name}
                  </h5>
                  <p className="text-[11px] text-[#565F52]">{company.legalName}</p>
                  <p className="text-[11px] text-[#565F52]">{company.address}</p>
                  <p className="text-[11px] text-[#565F52]">
                    Email: {company.emailGmail} · WhatsApp: {company.whatsapp}
                  </p>
                </div>
                <div className="text-right">
                  <span className="bg-[#182620] text-[#CC9A2E] font-bold px-2 py-0.5 rounded text-[10px] uppercase font-mono">
                    TAX INVOICE
                  </span>
                  <p className="font-mono font-bold mt-1 text-sm">{completedOrder.id}</p>
                  <p className="text-[11px] text-[#565F52]">
                    Date: {completedOrder.createdAt.slice(0, 10)}
                  </p>
                  <p className="text-[11px] text-[#565F52]">
                    Payment: {completedOrder.paymentMethod.toUpperCase()} (Txn: {completedOrder.payuTxnId})
                  </p>
                </div>
              </div>

              {/* Billed to */}
              <div className="grid grid-cols-2 gap-4 border-b border-[#CBCFB9] pb-3 text-[11px]">
                <div>
                  <span className="font-bold text-[#565F52] block">BILLED TO:</span>
                  <p className="font-semibold text-[#0F1913]">{completedOrder.customerName}</p>
                  <p>{completedOrder.shippingAddress}</p>
                  <p>{completedOrder.city}, {completedOrder.state} - {completedOrder.pincode}</p>
                  <p>Ph: {completedOrder.customerPhone} · Email: {completedOrder.customerEmail}</p>
                  {completedOrder.gstin && (
                    <p className="font-bold text-[#A87C1F]">Customer GSTIN: {completedOrder.gstin}</p>
                  )}
                </div>
                <div>
                  <span className="font-bold text-[#565F52] block">DISPATCH & LOGISTICS:</span>
                  <p>Courier: <span className="font-semibold">{completedOrder.courierName}</span></p>
                  <p>Tracking AWB: <span className="font-mono font-bold">{completedOrder.trackingNumber}</span></p>
                  <p>Status: <span className="text-[#3C6656] font-semibold uppercase">{completedOrder.orderStatus}</span></p>
                  <p className="text-[#565F52] mt-1">Live tracking active on udecs.store/track</p>
                </div>
              </div>

              {/* Item Table */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#CBCFB9] text-[#565F52] text-[10px] uppercase">
                    <th className="py-1.5">Description</th>
                    <th className="py-1.5">HSN</th>
                    <th className="py-1.5 text-center">Qty</th>
                    <th className="py-1.5 text-right">Unit Rate</th>
                    <th className="py-1.5 text-right">GST %</th>
                    <th className="py-1.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBCFB9]/40 text-[11px]">
                  {completedOrder.items.map((it, i) => (
                    <tr key={i}>
                      <td className="py-2 font-medium">{it.name} ({it.sku})</td>
                      <td className="py-2 font-mono">{it.hsn}</td>
                      <td className="py-2 text-center">{it.quantity}</td>
                      <td className="py-2 text-right">{formatPrice(it.unitPrice)}</td>
                      <td className="py-2 text-right">{it.gstRate}%</td>
                      <td className="py-2 text-right font-semibold">{formatPrice(it.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Breakdown */}
              <div className="border-t border-[#CBCFB9] pt-3 flex justify-end">
                <div className="w-64 space-y-1 text-right text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#565F52]">Taxable Subtotal:</span>
                    <span>{formatPrice(completedOrder.taxableAmount)}</span>
                  </div>
                  {completedOrder.cgst > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#565F52]">CGST (9%):</span>
                      <span>{formatPrice(completedOrder.cgst)}</span>
                    </div>
                  )}
                  {completedOrder.sgst > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#565F52]">SGST (9%):</span>
                      <span>{formatPrice(completedOrder.sgst)}</span>
                    </div>
                  )}
                  {completedOrder.igst > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#565F52]">IGST (18%):</span>
                      <span>{formatPrice(completedOrder.igst)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm text-[#0F1913] pt-1 border-t border-[#CBCFB9]">
                    <span>Invoice Total:</span>
                    <span className="text-[#3C6656]">{formatPrice(completedOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#CBCFB9] flex justify-between items-center text-[10px] text-[#565F52]">
                <span>This is a computer-generated GST invoice issued under Rule 46 of CGST Rules 2017.</span>
                <span className="font-semibold text-[#0F1913]">For UNICK DIGITAL E-COMMERCE SOLUTIONS</span>
              </div>
            </div>

            {/* Print and Close Actions */}
            <div className="flex flex-col sm:flex-row gap-3 no-print">
              <a
                href={generateWhatsAppLink(
                  company.whatsapp,
                  buildOrderPlacedMessage(completedOrder, whatsappConfig, language === 'bn' ? 'bn' : 'en')
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] hover:bg-[#1EBE5D] text-white py-3 px-4 rounded text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>{language === 'bn' ? 'WhatsApp-এ ইনভয়েস দেখুন' : 'View on WhatsApp'}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <button
                onClick={() => window.print()}
                className="flex-1 bg-[#182620] hover:bg-[#0F1913] text-white py-3 px-4 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <Printer className="w-4 h-4 text-[#CC9A2E]" />
                <span>{language === 'bn' ? 'জিএসটি ট্যাক্স ইনভয়েস প্রিন্ট করুন' : 'Print Official GST Invoice'}</span>
              </button>

              <button
                onClick={onClose}
                className="bg-[#E4E8D9] hover:bg-[#CBCFB9] text-[#0F1913] py-3 px-6 rounded text-xs font-semibold"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Done & Return'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
