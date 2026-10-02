import React, { useState, useEffect, useRef } from 'react';
import {customerAuth,customerSignIn,watchCustomerIdentity} from '../../customer-stage/customerIdentity';
import {customerOrderClient} from '../../customer-stage/orderRuntime';
import {retryKey, type OrderRequest} from '../../customer-stage/order-client';
import {isVerifiedGoogleCustomer} from '../../customer-stage/customerOrderIdentity';
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

const deliveryCharge = (pincode: string, items: { product: any; quantity: number }[], isCod: boolean, orderSubtotal: number) => {
  const zone = zoneForPincode(pincode);
  const rawWeight = items.reduce((w, item) => w + (item.product.weightKg || 0.5) * item.quantity, 0);
  const weightKg = Math.max(0.5, Math.round(rawWeight * 10) / 10); // 0.5 kg per unit default
  const base = weightKg <= 0.5
    ? RATE_FWD_05KG[zone]
    : RATE_FWD_2KG[zone] + RATE_ADDL_KG[zone] * Math.max(0, Math.ceil(weightKg - 2));
  let fee = base * (1 + FUEL_SURCHARGE_PCT);
  if (isCod) fee += COD_FLAT_FEE + orderSubtotal * COD_PERCENT_FEE;
  return { zone, weightKg, fee: Math.ceil(fee) };
};

const UPI_ID = '7319190514@upi'; // Owner-confirmed QR destination, 1 Oct 2026
const UPI_PAYEE_NAME = 'SK SAHARUK HOSSAIN';

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
    clearCart,
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

  const [customer,setCustomer]=useState(customerAuth.currentUser);
  const [identityReady,setIdentityReady]=useState(false);
  const [loginBusy,setLoginBusy]=useState(false);
  const [loginError,setLoginError]=useState('');
  const attempt=React.useRef<{uid:string;input:OrderRequest;key:string}|null>(null);
  const requestBusy=React.useRef(false);
  const [orderError,setOrderError]=useState('');
  const [wasRecovered,setWasRecovered]=useState(false);
  const [recoverOnLoad,setRecoverOnLoad]=useState(false);
  useEffect(()=>{if(customer?.uid){setRecoverOnLoad(!!localStorage.getItem('udecs-order-retry-'+customer.uid));}else{setRecoverOnLoad(false);attempt.current=null;}},[customer?.uid]);
  useEffect(()=>watchCustomerIdentity(user=>{setCustomer(user);setIdentityReady(true);setFormData(old=>({...old,email:isVerifiedGoogleCustomer(user)?user!.email!:''}));}),[]);
  const signInForOrder=async()=>{setLoginBusy(true);setLoginError('');try{await customerSignIn();}catch{setLoginError('Google sign-in did not finish. Please try again. No order was placed.');}finally{setLoginBusy(false);}};

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const gatewayRef=useRef<HTMLDivElement>(null);const [payuError,setPayuError]=useState('');const [payuBusy,setPayuBusy]=useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'upi_pay' | 'payu_pay' | 'complete'>('details');



  const gatewayVerification=checkoutItems.length===1&&(checkoutItems[0].product as any).gatewayVerification===true&&checkoutItems[0].product.id==='UDECS_OWNER_GATEWAY_50';
  useEffect(()=>{if(gatewayVerification)setPaymentMethod('payu');},[gatewayVerification]);
  const quoteShipping = checkoutItems.some(item => item.product.shippingMode === 'quote');
  const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  // Calculate totals & GST
  const subtotal = checkoutItems.reduce((sum, item) => {
    const isWholesale =
      item.isWholesale || item.quantity >= item.product.minWholesaleQty;
    const price = isWholesale ? item.product.wholesalePrice : item.product.price;
    return sum + price * item.quantity;
  }, 0);

  // Is Intrastate (West Bengal) or Interstate (Outside WB)
  const isWestBengal = formData.state.toLowerCase().includes('bengal');
  const taxableAmount = gatewayVerification?0:roundMoney(checkoutItems.reduce((sum, item) => {
    const price = item.isWholesale || item.quantity >= item.product.minWholesaleQty ? item.product.wholesalePrice : item.product.price;
    return sum + (item.product.gstExtra ? price * item.quantity : price * item.quantity / 1.18);
  }, 0));
  const totalGst = gatewayVerification?0:roundMoney(checkoutItems.reduce((sum, item) => {
    const price = item.isWholesale || item.quantity >= item.product.minWholesaleQty ? item.product.wholesalePrice : item.product.price;
    return sum + (item.product.gstExtra ? roundMoney(price * item.quantity * item.product.gstRate / 100) : price * item.quantity - price * item.quantity / 1.18);
  }, 0));
  const cgst = isWestBengal ? roundMoney(totalGst / 2) : 0;
  const sgst = isWestBengal ? roundMoney(totalGst - cgst) : 0;
  const igst = !isWestBengal ? totalGst : 0;
  const delivery = quoteShipping ? { zone: zoneForPincode(formData.pincode), weightKg: 0, fee: 0 } : deliveryCharge(formData.pincode, checkoutItems, paymentMethod === 'cod', subtotal);
  const shippingFee = gatewayVerification?0:delivery.fee;
  const totalAmount = gatewayVerification?50:roundMoney(taxableAmount + totalGst + shippingFee);

  // UPI deep link + QR (amount-encoded, order ref in the note)
  const upiDeepLink = completedOrder
    ? `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&am=${completedOrder.totalAmount}&cu=INR&tn=${encodeURIComponent(`UDECS Order ${completedOrder.id}`)}`
    : '';
  const upiQrDataUrl = React.useMemo(() => {
    if (!upiDeepLink) return '';
    const qr = qrcode(0, 'M');
    qr.addData(upiDeepLink);
    qr.make();
    return qr.createDataURL(6, 2);
  }, [upiDeepLink]);

  if (!isOpen) return null;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!quoteShipping&&checkoutItems.length>10){setLoginError("Each order can contain up to 10 different products. Remove extra products before continuing.");return;}
    if(!quoteShipping&&(!identityReady||!isVerifiedGoogleCustomer(customerAuth.currentUser))){setLoginError('Sign in with Google before placing an order. No order was placed.');return;}
    if(!quoteShipping&&formData.email!==customerAuth.currentUser?.email){setLoginError('Your Google account changed. Review your details before ordering.');return;}
    if (!formData.name || !formData.email || !formData.phone || !formData.address) {
      alert('Please fill in all mandatory billing and shipping fields.');
      return;
    }

    if (quoteShipping) {
      const lines = checkoutItems.map(item => {
        const price = item.isWholesale || item.quantity >= item.product.minWholesaleQty ? item.product.wholesalePrice : item.product.price;
        return `${item.product.sku}: ${item.product.name}, ${item.quantity} pcs, INR ${price}/piece, GST ${item.product.gstRate}% ${item.product.gstExtra ? 'extra' : 'included'}`;
      });
      const message = `Wholesale order request (not paid or confirmed)
${lines.join('\n')}
Goods + GST: INR ${totalAmount}. Shipping quote required before payment.
Name: ${formData.name}
Phone: ${formData.phone}
Email: ${formData.email}
Address: ${formData.address}, ${formData.city}, ${formData.state}, ${formData.pincode}
GSTIN: ${formData.gstin || 'not provided'}`;
      window.location.assign(generateWhatsAppLink(company.whatsapp, message));
      return;
    }
    if(gatewayVerification||paymentMethod==='payu'){void executeOrderPlacement('payu');}
    else if (paymentMethod === 'upi') {
      // Place the order first (pending), then show the UPI QR with the order ref
      void executeOrderPlacement('upi');
    } else {
      void executeOrderPlacement('cod');
    }
  };

  const executeOrderPlacement = async (method: 'upi'|'cod'|'payu') => {
    if(requestBusy.current)return;
    const user=customerAuth.currentUser;
    if(!isVerifiedGoogleCustomer(user)||formData.email!==user?.email){setLoginError('Sign in again and review your details. No order was placed.');return;}
    if(currency!=='INR'){setOrderError('Only INR checkout is supported. No request was sent.');return;}
    requestBusy.current=true;setIsProcessing(true);setOrderError('');
    try{
      const api=customerOrderClient(),reference=retryKey(user!.uid,localStorage);
      // Always recover the prior key first. Do not start a new key after uncertain saves.
      const recovered=await api.recover(reference.key);
      let saved;
      if(recovered.found)saved=recovered.order;
      else{
        if(attempt.current&&attempt.current.uid!==user!.uid)attempt.current=null;
        if(!attempt.current)attempt.current={uid:user!.uid,key:reference.key,input:{customerName:formData.name,customerPhone:formData.phone,shippingAddress:formData.address,city:formData.city,state:formData.state,pincode:formData.pincode,gstin:formData.gstin||undefined,currency:'INR',paymentMethod:method,expectedTotal:totalAmount,items:checkoutItems.map(i=>({productId:i.product.id,quantity:i.quantity,isWholesale:i.isWholesale}))}};
        saved=(await api.create(attempt.current.input,attempt.current.key)).order;
      }
      if(customerAuth.currentUser?.uid!==user!.uid)throw Error('Customer account changed. Sign in to the original account to recover the saved order.');
      reference.confirmed();attempt.current=null;setWasRecovered(!!recovered.found);
      setCompletedOrder(saved);setCheckoutStep(saved.paymentMethod==='payu'?'payu_pay':saved.paymentMethod==='upi'?'upi_pay':'complete');if(!recovered.found)clearCart();onOrderSuccess(saved);
    }catch(e){setOrderError((e instanceof Error?e.message:'Order could not be confirmed')+'. Cart kept. Retry keeps the same order reference; it does not start a second order.');}
    finally{requestBusy.current=false;setIsProcessing(false);}
  };

  const openPayU=async()=>{if(!completedOrder||payuBusy)return;setPayuBusy(true);setPayuError('');try{const u=customerAuth.currentUser;if(!isVerifiedGoogleCustomer(u))throw Error('Sign in to the original Google account first');const r=await fetch('https://udecs-payu-api.sksaharukhossain1996.workers.dev/api/payu/customer/form',{method:'POST',headers:{Authorization:'Bearer '+await u!.getIdToken(),'Content-Type':'application/json'},body:JSON.stringify({orderId:completedOrder.id})});const d=await r.json();if(!r.ok)throw Error(d.error||'PayU unavailable');if(d.action!=='https://secure.payu.in/_payment'||d.fields.udf1!==completedOrder.id||d.fields.amount!==Number(completedOrder.totalAmount).toFixed(2))throw Error('Gateway total mismatch. Do not pay.');const f=document.createElement('form');f.method='post';f.action=d.action;for(const[k,v]of Object.entries(d.fields)){const i=document.createElement('input');i.type='hidden';i.name=k;i.value=String(v);f.appendChild(i);}const b=document.createElement('button');b.type='submit';b.textContent='Continue to PayU - INR '+d.fields.amount;b.className='rounded border px-4 py-3';f.appendChild(b);gatewayRef.current?.replaceChildren(f);}catch(e){setPayuError(e instanceof Error?e.message:'Gateway unavailable');}finally{setPayuBusy(false);}};
  if(checkoutStep==='payu_pay'&&completedOrder)return <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><section className="bg-white rounded p-6 max-w-lg space-y-4"><h3 className="text-xl font-bold">PayU payment for saved order</h3><p>{completedOrder.id}</p><p>Total INR {completedOrder.totalAmount}. Order saved, payment not confirmed.</p><p>Review this exact total on PayU before paying. Do not pay twice. If charged but pending, contact UDECS with this order ID.</p><button disabled={payuBusy} onClick={()=>void openPayU()} className="rounded border px-4 py-3">{payuBusy?'Preparing saved payment...':'Prepare PayU payment'}</button><div ref={gatewayRef}/>{payuError&&<p role="alert">{payuError}</p>}<button className="rounded border px-4 py-3" onClick={onClose}>Close and view My Orders</button></section></div>;
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
                  : gatewayVerification?'Gateway verification - no delivery':'Secure Checkout & Tax Billing'}
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

        {wasRecovered&&<p className="rounded border p-3">Your earlier saved order was recovered. No second order was placed. Your current cart was kept.</p>}
        {/* STEP 1: Details & Billing Form */}
        {checkoutStep === 'details'&&!quoteShipping&&(!identityReady||!isVerifiedGoogleCustomer(customer))&&<section className="space-y-4 p-4"><h3 className="text-xl font-bold">Sign in before ordering</h3><p>Use your Google account to continue with a UPI or COD order. Your cart stays here while you sign in.</p><p className="text-sm">Google sign-in shares your basic profile and email, not your Gmail inbox. It does not verify your phone number.</p><button type="button" disabled={!identityReady||loginBusy} onClick={signInForOrder} className="w-full rounded bg-[#182620] p-3 text-white">{!identityReady?'Checking customer sign-in...':loginBusy?'Opening Google...':'Sign in with Google to continue'}</button>{loginError&&<p role="alert">{loginError}</p>}</section>}
        {checkoutStep === 'details'&&(quoteShipping||(identityReady&&isVerifiedGoogleCustomer(customer))) && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {!quoteShipping&&<p className="rounded border p-3">Signed in as {customer?.email}. Your order email uses this Google account.</p>}
            {loginError&&<p role="alert">{loginError}</p>}
            {orderError&&<p role="alert">{orderError}</p>}
            {recoverOnLoad&&<p className="rounded border p-3">An earlier order request may still need confirmation. This checkout will check that reference before creating any new order.</p>}
            {attempt.current&&<p className="rounded border p-3">An earlier request is not yet confirmed. Retrying sends those original details, not edited fields. Do not pay until an order is confirmed.</p>}
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
                      readOnly={!quoteShipping}
                      required
                      placeholder="e.g. farooq@gmail.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2.5 text-[#0F1913] focus:border-[#A87C1F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#182620] mb-1">
                      {language === 'bn' ? 'মোবাইল নম্বর (SMS ট্র্যাকিংয়ের জন্য) *' : 'Phone Number (for order support) *'}
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
                <div className="pt-2" hidden={quoteShipping}>
                  <h4 className="text-sm font-bold text-[#0F1913] uppercase tracking-wider font-heading border-b border-[#CBCFB9] pb-1 mb-2.5">
                    2. {language === 'bn' ? 'পেমেন্ট মেথড নির্বাচন করুন' : 'Select Payment Method'}
                  </h4>

                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-white border rounded"><input type="radio" name="payment" checked={gatewayVerification||paymentMethod==='payu'} onChange={()=>setPaymentMethod('payu')}/><span>PayU - UPI, cards and net banking. Review final total before paying.</span></label>
                    <label className={gatewayVerification?"hidden":"flex items-center gap-3 p-3 bg-white border border-[#CC9A2E] rounded cursor-pointer"}>
                      <input
                        type="radio"
                        name="payment"
                        disabled={gatewayVerification}
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

                    <label className={gatewayVerification?"hidden":"flex items-center gap-3 p-3 bg-white border border-[#CBCFB9] hover:border-[#0F1913] rounded cursor-pointer"}>
                      <input
                        type="radio"
                        name="payment"
                        disabled={gatewayVerification}
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
                    {gatewayVerification?'Verification summary':language === 'bn' ? 'অর্ডারের বিবরণ ও জিএসটি' : 'Order Summary & GST'}
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
                              {!gatewayVerification&&isWs && ' (Wholesale)'}
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
                      <span>{gatewayVerification?'Gateway verification:':'Taxable Value:'}</span>
                      <span>{formatPrice(gatewayVerification?50:taxableAmount)}</span>
                    </div>

                    {!gatewayVerification&&(isWestBengal ? (
                      <>
                        <div className="flex justify-between">
                          <span>CGST:</span>
                          <span>{formatPrice(cgst)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SGST:</span>
                          <span>{formatPrice(sgst)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <span>IGST:</span>
                        <span>{formatPrice(igst)}</span>
                      </div>
                    ))}

                    <div className="flex justify-between">
                      <span>{gatewayVerification?'No delivery:':quoteShipping ? 'Shipping:' : `Shipping (${delivery.weightKg} kg, ${ZONE_LABELS[delivery.zone]}):`}</span>
                      <span className="text-[#3C6656] font-semibold">
                        {quoteShipping ? 'Quoted separately, not included' : formatPrice(shippingFee)}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#CBCFB9] flex justify-between items-baseline text-sm font-bold text-[#0F1913]">
                      <span>{quoteShipping ? 'Goods + GST (shipping extra):' : 'Total Amount:'}</span>
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
                      {quoteShipping ? 'Send order request for shipping quote on WhatsApp' : gatewayVerification||paymentMethod==='payu' ? 'Save order and continue to PayU' : paymentMethod === 'upi'
                        ? language === 'bn'
                          ? 'অর্ডার করুন ও UPI QR দেখুন'
                          : 'Place Order & Show UPI QR'
                        : language === 'bn'
                        ? 'ক্যাশ অন ডেলিভারিতে নিশ্চিত করুন'
                        : 'Confirm Cash on Delivery Order'}
                    </span>
                  </button>

                  <div className="mt-2 text-center text-[10px] text-[#565F52]">
                    {quoteShipping ? 'Availability and shipping confirmed before payment. No payment or order is completed here.' : gatewayVerification||paymentMethod==='payu'?'Order saved before payment. Review final total on PayU.':'Secure Checkout · Direct UPI to UDECS · Order Summary'}
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
                Payment remains pending until UDECS verifies it. You can contact UDECS
                on WhatsApp with your payment screenshot.
              </p>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setCheckoutStep('complete')}
                className="bg-[#0F1913] text-white font-bold px-6 py-3 rounded text-sm hover:bg-[#182620] transition-all"
              >
                Continue to order summary
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
                      : 'COD Order Saved'}
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
                    : 'Order saved. Payment pending; dispatch not confirmed.'}
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
                    ORDER SUMMARY
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
                  <p className="text-[#565F52] mt-1">No live courier tracking is connected.</p>
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
                      <span className="text-[#565F52]">CGST:</span>
                      <span>{formatPrice(completedOrder.cgst)}</span>
                    </div>
                  )}
                  {completedOrder.sgst > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#565F52]">SGST:</span>
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
                    <span>Order Total:</span>
                    <span className="text-[#3C6656]">{formatPrice(completedOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#CBCFB9] flex justify-between items-center text-[10px] text-[#565F52]">
                <span>This order summary is not proof of payment or a confirmed dispatch.</span>
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
                <span>{language === 'bn' ? 'অর্ডার সারাংশ প্রিন্ট করুন' : 'Print Order Summary'}</span>
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
