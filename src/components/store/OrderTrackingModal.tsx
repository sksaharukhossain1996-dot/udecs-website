import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Order } from '../../types';
import { BrandLogo } from '../common/BrandLogo';
import {
  X,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  Printer,
  ShieldCheck,
  Phone,
} from 'lucide-react';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  initialOrderId = '',
}) => {
  const { orders, formatPrice, company, language } = useStore();
  const [searchQuery, setSearchQuery] = useState(initialOrderId || 'UDECS-ORD-9842');
  const [activeOrder, setActiveOrder] = useState<Order | null>(() => {
    return (
      orders.find(
        (o) =>
          o.id.toLowerCase() === searchQuery.trim().toLowerCase() ||
          o.customerPhone.includes(searchQuery.trim())
      ) || orders[0] || null
    );
  });

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    const found = orders.find(
      (o) =>
        o.id.toLowerCase() === query ||
        o.customerPhone.toLowerCase().includes(query) ||
        (o.trackingNumber && o.trackingNumber.toLowerCase().includes(query))
    );
    setActiveOrder(found || null);
  };

  const getStepIndex = (status: Order['orderStatus']): number => {
    switch (status) {
      case 'pending':
        return 0;
      case 'processing':
        return 1;
      case 'packed':
        return 2;
      case 'shipped':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 1;
    }
  };

  const currentStep = activeOrder ? getStepIndex(activeOrder.orderStatus) : 0;

  const milestones = [
    { label: language === 'bn' ? 'অর্ডার গৃহীত' : 'Order Placed', desc: 'Payment Verified via PayU' },
    { label: language === 'bn' ? 'প্রসেসিং' : 'Processing', desc: 'Inventory Allocated' },
    { label: language === 'bn' ? 'প্যাকেজিং সম্পন্ন' : 'Packed', desc: 'QC & Barcode Scanned' },
    { label: language === 'bn' ? 'কুরিয়ারে পাঠানো হয়েছে' : 'Dispatched', desc: 'In Transit' },
    { label: language === 'bn' ? 'ডেলিভারি সম্পন্ন' : 'Delivered', desc: 'Doorstep Delivery' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1913]/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-[#FBFAF5] border border-[#CBCFB9] rounded-lg max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#CBCFB9] mb-5">
          <div className="flex items-center gap-3">
            <BrandLogo size="xs" showText={false} />
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#3C6656]" />
              <h3 className="text-xl font-bold font-heading text-[#0F1913]">
                {language === 'bn' ? 'লাইভ অর্ডার ট্র্যাকিং' : 'Live Order & Shipment Tracking'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#E4E8D9] text-[#565F52]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={language === 'bn' ? 'অর্ডার আইডি বা মোবাইল নম্বর দিন (যেমন: UDECS-ORD-9842)' : 'Enter Order ID or Mobile Number (e.g. UDECS-ORD-9842)'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-white border border-[#CBCFB9] rounded-l px-3 py-2.5 text-[#0F1913] focus:outline-none focus:border-[#A87C1F]"
            />
          </div>
          <button
            type="submit"
            className="bg-[#0F1913] hover:bg-[#182620] text-white px-4 py-2.5 rounded-r text-xs font-semibold flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'খুঁজুন' : 'Track'}</span>
          </button>
        </form>

        {/* Tracking Details */}
        {activeOrder ? (
          <div className="space-y-6">
            {/* Courier & AWB Banner */}
            <div className="bg-[#EEF0E7] p-4 rounded-md border border-[#CBCFB9] flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#565F52] block">
                  Carrier / Logistics Partner
                </span>
                <span className="font-bold text-sm text-[#0F1913]">
                  {activeOrder.courierName || 'Delhivery Surface Logistics'}
                </span>
                <div className="text-xs text-[#565F52] mt-0.5 font-mono">
                  AWB: <span className="font-bold text-[#A87C1F]">{activeOrder.trackingNumber || 'Pending Assignment'}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-[#565F52] block">
                  Current Status
                </span>
                <span className="inline-block bg-[#3C6656] text-white text-xs font-bold px-2.5 py-0.5 rounded uppercase">
                  {activeOrder.orderStatus}
                </span>
                <div className="text-[11px] text-[#565F52] mt-0.5">
                  Ordered on {activeOrder.createdAt.slice(0, 10)}
                </div>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="py-2">
              <div className="grid grid-cols-5 gap-1 relative">
                {/* Connecting bar */}
                <div className="absolute top-4 left-4 right-4 h-1 bg-[#CBCFB9] -z-0">
                  <div
                    className="h-full bg-[#3C6656] transition-all duration-500"
                    style={{
                      width: `${(currentStep / (milestones.length - 1)) * 100}%`,
                    }}
                  />
                </div>

                {milestones.map((ms, idx) => {
                  const isPassed = idx <= currentStep;
                  const isCurrent = idx === currentStep;

                  return (
                    <div key={idx} className="flex flex-col items-center text-center z-10">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          isPassed
                            ? 'bg-[#3C6656] text-white'
                            : 'bg-[#E4E8D9] text-[#565F52] border border-[#CBCFB9]'
                        } ${isCurrent ? 'ring-4 ring-[#3C6656]/20' : ''}`}
                      >
                        {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className="text-[11px] font-bold text-[#0F1913] mt-2 leading-tight">
                        {ms.label}
                      </span>
                      <span className="text-[9px] text-[#565F52] hidden sm:block">
                        {ms.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delivery & Items details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-white p-4 rounded border border-[#CBCFB9]">
              <div>
                <span className="font-bold text-[#565F52] block mb-1">
                  Delivery Destination:
                </span>
                <p className="font-semibold text-[#0F1913]">{activeOrder.customerName}</p>
                <p className="text-[#565F52]">{activeOrder.shippingAddress}</p>
                <p className="text-[#565F52]">
                  {activeOrder.city}, {activeOrder.state} - {activeOrder.pincode}
                </p>
                <p className="text-[#565F52] mt-1">
                  Contact: <span className="font-mono">{activeOrder.customerPhone}</span>
                </p>
              </div>

              <div>
                <span className="font-bold text-[#565F52] block mb-1">
                  Order Items ({activeOrder.items.length}):
                </span>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {activeOrder.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-[#0F1913]">
                      <span className="truncate pr-2">
                        {it.quantity}× {it.name}
                      </span>
                      <span className="font-semibold">{formatPrice(it.totalPrice)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-1 border-t border-[#CBCFB9] flex justify-between font-bold text-[#0F1913]">
                  <span>Total Amount Paid:</span>
                  <span className="text-[#3C6656]">{formatPrice(activeOrder.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Support CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-[#FBFAF5] p-3 rounded border border-[#CBCFB9]">
              <div className="flex items-center gap-2 text-[#565F52]">
                <Phone className="w-4 h-4 text-[#3C6656]" />
                <span>
                  Delivery inquiry? WhatsApp support:{' '}
                  <a
                    href={`https://wa.me/919845485437?text=Hi, inquiring about my order ${activeOrder.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-[#0F1913] underline hover:text-[#3C6656]"
                  >
                    +91 9845485437
                  </a>
                </span>
              </div>

            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-[#565F52]">
            <Package className="w-10 h-10 mx-auto text-[#CBCFB9] mb-2" />
            <p className="text-sm font-semibold text-[#0F1913]">
              No order found matching &quot;{searchQuery}&quot;
            </p>
            <p className="text-xs text-[#565F52] mt-1">
              Please check your Order ID from your confirmation SMS/Email, or enter your registered 10-digit mobile number.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
