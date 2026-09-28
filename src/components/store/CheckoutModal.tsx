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
// @ts-ignore - vendored MIT QR generator, no types
import qrcode from '../../lib/qrcode-generator';

// ---- Delivery rate card: iThink Logistics (Xpressbees Surface) from origin 721152 (Panskura, WB)
// Card captured from the owner's iThink panel on 28 Sep 2026; +7.5% fuel surcharge; COD extra.
type DeliveryZone = 'A' | 'B' | 'C' | 'D' | 'E';
const RATE_FWD_05KG: Record<DeliveryZone, number> = { A: 50.17, B: 57.13, C: 62.35, D: 67.57, E: 105.85 };
const RATE_FWD_2KG: Record<DeliveryZone, number> = { A: 82.65, B: 97.15, C: 111.65, D: 126.15, E: 146.45 };
const RATE_ADDL_KG: Record<DeliveryZone, number> = { A: 23.20, B: 30.45, C: 37.70, D: 42.05, E: 47.85 };
const FUEL_SURCHARGE_PCT = 0.075;
const COD_FLAT_FEE = 32;
const COD_PERCENT_FEE = 0.0175;

const zoneForPincode = (pincode: string): DeliveryZone => {
  const pin = (pincode || '').trim();
  if (!/^\d{6}$/.test(pin)) return 'D';
  const p3 = parseInt(pin.slice(0, 3), 10);
  const p2 = parseInt(pin.slice(0, 2), 10);
  if (pin.startsWith('721')) return 'A';
  if (p3 >= 700 && p3 <= 743) return 'B';
  if (p3 === 744 || p2 === 78 || p2 === 79 || p2 === 18 || p2 === 19) return 'E';
  if ([110, 400, 411, 560, 600, 500, 380].indexOf(p3) !== -1) return 'C';
  if (p3 >= 750 && p3 <= 770) return 'C';
  if (p2 >= 80 && p2 <= 85) return 'C';
  return 'D';
};

const ZONE_LABELS: Record<DeliveryZone, string> = {
  A: 'Local', B: 'West Bengal', C: 'Metro / Nearby', D: 'Rest of India', E: 'Remote',
};

const deliveryCharge = (pincode: string, itemCount: number, isCod: boolean, orderSubtotal: number) => {
  const zone = zoneForPincode(pincode);
  const weightKg = Math.max(0.5, itemCount * 0.5); // 0.5 kg per item default
  const base = weightKg <= 0.5
    ? RATE_FWD_05KG[zone]
    : RATE_FWD_2KG[zone] + RATE_ADDL_KG[zone] * Math.max(0, Math.ceil(weightKg - 2));
  let fee = base * (1 + FUEL_SURCHARGE_PCT);
  if (isCod) fee += COD_FLAT_FEE + orderSubtotal * COD_PERCENT_FEE;
  return { zone, weightKg, fee: Math.ceil(fee) };
};

const UPI_ID = '9845485437@ybl'; // customer payments - user-chosen (twice) 01:58, PhonePe handle on business number
const UPI_PAYEE_NAME = 'UDECS';

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

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'upi_pay' | 'complete'>('details');

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
  const itemCount = checkoutItems.reduce((n, item) => n + item.quantity, 0);
  const delivery = deliveryCharge(formData.pincode, itemCount, paymentMethod === 'cod', subtotal);
  const shippingFee = delivery.fee;
  const totalAmount = subtotal + shippingFee;

  // UPI deep link + QR (amount-encoded, order ref in the note)
  const upiDeepLink = completedOrder
    ? `upi://pay?pa=${UPI_ID}&pn=${UPI_PAYEE_NAME}&am=${completedOrder.totalAmount}&cu=INR&tn=${encodeURIComponent(`UDECS Order ${completedOrder.id}`)}`
    : '';
  const upiQrDataUrl = React.useMemo(() => {
    if (!upiDeepLink) return '';
    const qr = qrcode(0, 'M');
    qr.addData(upiDeepLink);
    qr.make();
    return qr.createDataURL(6, 2);
  }, [upiDeepLink]);

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

    if (paymentMethod === 'upi') {
      // Place the order first (pending), then show the UPI QR with the order ref
      executeOrderPlacement('upi', `UPI_${Date.now().toString().slice(-8)}`);
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
      paymentStatus: 'pending', // UPI + COD both stay pending until admin marks payment received
      payuTxnId: txnId,
      orderStatus: method === 'upi' ? 'pending' : 'processing',
      courierName: undefined,
      trackingNumber: undefined,
    });

    setIsProcessing(false);
    setCompletedOrder(newOrder);
    setCheckoutStep(method === 'upi' ? 'upi_pay' : 'complete');
    onOrderSuccess(newOrder);
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
                {checkoutStep === 'complete'
                  ? language === 'bn'
                    ? 'অর্ডার সফলভাবে সম্পন্ন হয়েছে!'
                    : 'Order Placed Successfully!'
                  : checkoutStep === 'upi_pay'
                  ? 'UPI Payment'
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
        {checkoutStep === 'details' && (
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
                        checked={paymentMethod === 'upi'}
                        onChange={() => setPaymentMethod('upi')}
                        className="accent-[#CC9A2E]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0F1913]">
                            UPI QR - Direct Bank Payment (Recommended)
                          </span>
                          <span className="text-[10px] bg-[#CC9A2E]/20 text-[#A87C1F] font-semibold px-2 py-0.5 rounded">
0% Fee · Instant
                          </span>
                        </div>
                        <p className="text-[11px] text-[#565F52]">
                          Scan a QR with GPay, PhonePe or Paytm - money goes straight to our bank account
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
                      <span>Shipping ({delivery.weightKg} kg, {ZONE_LABELS[delivery.zone]}):</span>
                      <span className="text-[#3C6656] font-semibold">
                        {formatPrice(shippingFee)}
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
                      {paymentMethod === 'upi'
                        ? language === 'bn'
                          ? 'অর্ডার করুন ও UPI QR দেখুন'
                          : 'Place Order & Show UPI QR'
                        : language === 'bn'
                        ? 'ক্যাশ অন ডেলিভারিতে নিশ্চিত করুন'
                        : 'Confirm Cash on Delivery Order'}
                    </span>
                  </button>

                  <div className="mt-2 text-center text-[10px] text-[#565F52]">
                    Secure Checkout · Direct UPI to UDECS Bank Account · GST Invoice Included
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* STEP 2: UPI QR Payment (order already placed as pending) */}
        {checkoutStep === 'upi_pay' && completedOrder && (
          <div className="space-y-6">
            <div className="bg-[#182620] text-white p-5 rounded-lg border border-[#CC9A2E]/40 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-mono text-[#B9BFAE]">UPI DIRECT PAYMENT</span>
                <div className="text-right">
                  <span className="text-xs text-[#B9BFAE] block">Payable:</span>
                  <span className="text-lg font-black text-[#CC9A2E]">
                    {formatPrice(completedOrder.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={upiQrDataUrl} alt="UPI QR Code" className="w-52 h-52" />
                </div>
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm font-bold">Scan with GPay, PhonePe, Paytm or any UPI app</p>
                <p className="text-xs text-[#B9BFAE]">
                  UPI ID: <span className="font-mono text-white font-semibold">{UPI_ID}</span>
                  {' '}&middot; {UPI_PAYEE_NAME}
                </p>
                <p className="text-xs text-[#B9BFAE]">
                  Order Ref: <span className="font-mono text-white">{completedOrder.id}</span>
                </p>
              </div>

              <div className="text-center">
                <a
                  href={upiDeepLink}
                  className="inline-flex items-center gap-2 bg-[#CC9A2E] text-[#0F1913] font-bold px-5 py-2.5 rounded text-sm hover:brightness-110 transition-all"
                >
                  <Smartphone className="w-4 h-4" />
                  Tap to pay in your UPI app
                </a>
              </div>

              <p className="text-[11px] text-[#B9BFAE] text-center">
                We confirm your payment on WhatsApp before dispatch. You can share the payment
                screenshot with us there.
              </p>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setCheckoutStep('complete')}
                className="bg-[#0F1913] text-white font-bold px-6 py-3 rounded text-sm hover:bg-[#182620] transition-all"
              >
                I have paid - Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Order Completed & Tax Invoice Ready */}
        {checkoutStep === 'complete' && completedOrder && (
          <div className="space-y-6 animate-scaleIn">
            <div className="text-center py-4 bg-[#E4E8D9] rounded-lg border border-[#CBCFB9] space-y-2">
              <CheckCircle className="w-12 h-12 text-[#3C6656] mx-auto mb-1" />
              <h4 className="text-xl font-black text-[#0F1913] font-heading">
                {completedOrder.paymentMethod === 'upi'
                    ? language === 'bn'
                      ? 'অর্ডার রিসিভ হয়েছে!'
                      : 'Order Received - Payment Verification Pending'
                    : language === 'bn'
                      ? 'অর্ডার কনফার্ম হয়েছে!'
                      : 'COD Order Confirmed!'}
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
                    ? 'অর্ডার সেভ হয়েছে - WhatsApp এ কনফার্মেশন আসবে'
                    : 'Order saved - our team will confirm on WhatsApp'}
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
