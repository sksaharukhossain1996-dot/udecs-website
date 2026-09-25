import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Order, OrderStatus } from '../../types';
import { sendGmailEmail, getCachedGmailToken } from '../../services/gmailService';
import {
  Search,
  Filter,
  Printer,
  Truck,
  CheckCircle,
  FileText,
  Mail,
  Send,
  Download,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  X,
  MessageSquare,
} from 'lucide-react';
import { generateWhatsAppLink, buildOrderPlacedMessage, buildOrderShippedMessage } from '../../services/whatsappService';

export const AdminOrders: React.FC = () => {
  const { orders, updateOrderStatus, formatPrice, company, language, addAuditLog, whatsappConfig } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showShippingLabel, setShowShippingLabel] = useState<Order | null>(null);

  // Email state
  const [emailingOrder, setEmailingOrder] = useState<Order | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const startEmailForOrder = (order: Order) => {
    setEmailingOrder(order);
    setEmailSubject(`[UDECS] Order Status Update: ${order.id} (${order.orderStatus.toUpperCase()})`);
    setEmailBody(
      `Dear ${order.customerName},\n\n` +
      `Here is an update on your order ${order.id} placed with UDECS.\n\n` +
      `Order Status: ${order.orderStatus.toUpperCase()}\n` +
      `Total Value: ₹${order.totalAmount.toLocaleString('en-IN')}\n` +
      `Courier Partner: ${order.courierName || 'Delhivery Express'}\n` +
      `Air Waybill / Tracking ID: ${order.trackingNumber || 'Processing'}\n` +
      `Delivery Address: ${order.shippingAddress}, ${order.city}, ${order.state} - ${order.pincode}\n\n` +
      `For any questions, reply directly to this email or contact us at ${company.whatsapp}.\n\n` +
      `Warm regards,\n` +
      `UDECS Customer Fulfillment Team`
    );
  };

  const handleExecuteSendEmail = async () => {
    if (!emailingOrder) return;
    setConfirmSendOpen(false);
    setIsSendingEmail(true);

    try {
      const token = getCachedGmailToken();
      if (!token) {
        alert('Please connect your Google Account in the "Gmail Workspace Hub" tab before sending emails.');
        return;
      }

      await sendGmailEmail({
        to: emailingOrder.customerEmail,
        subject: emailSubject,
        bodyText: emailBody,
        fromName: `${company.name} Support`,
      });

      addAuditLog({
        action: 'ORDER_EMAIL_DISPATCHED',
        module: 'ORDERS',
        details: `Sent order update email for #${emailingOrder.id} to ${emailingOrder.customerEmail} via Gmail`,
      });

      alert(`Email dispatched to ${emailingOrder.customerEmail} successfully!`);
      setEmailingOrder(null);
    } catch (err: any) {
      console.error('Failed to send order email:', err);
      alert(`Failed to send email: ${err?.message || 'Error occurred'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const filteredOrders = orders.filter((ord) => {
    const matchesSearch =
      ord.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.customerPhone.includes(searchTerm) ||
      (ord.trackingNumber && ord.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || ord.orderStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateOrderStatus(orderId, newStatus);
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBCFB9]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0F1913]">
            {language === 'bn' ? 'অর্ডার প্রসেসিং ও লজিস্টিকস শিপিং হাব' : 'Orders Fulfillment & Logistics Shipping Hub'}
          </h1>
          <p className="text-xs text-[#565F52] mt-0.5">
            Automated courier AWB dispatch, Delhivery/Shiprocket tracking integration & GST invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-[#E4E8D9] text-[#182620] px-2.5 py-1 rounded font-bold">
            Total Orders: {orders.length}
          </span>
        </div>
      </div>

      {/* Controls Bar: Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-lg border border-[#CBCFB9]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#565F52] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Order ID, Customer, Phone, AWB..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs bg-[#FBFAF5] border border-[#CBCFB9] rounded pl-9 pr-3 py-2 text-[#0F1913] focus:outline-none focus:border-[#A87C1F]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-4 h-4 text-[#565F52] shrink-0" />
          {['all', 'pending', 'processing', 'packed', 'shipped', 'delivered'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`text-xs px-3 py-1.5 rounded font-semibold whitespace-nowrap capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-[#182620] text-white'
                  : 'bg-[#FBFAF5] text-[#565F52] border border-[#CBCFB9] hover:bg-[#E4E8D9]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-[#CBCFB9] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#EEF0E7] text-[#0F1913] font-heading font-bold uppercase text-[11px] border-b border-[#CBCFB9]">
                <th className="p-3">Order ID & Date</th>
                <th className="p-3">Customer & Destination</th>
                <th className="p-3">Items & Qty</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Payment Mode</th>
                <th className="p-3">Logistics & AWB</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CBCFB9]/40">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#565F52]">
                    No orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#FBFAF5] transition-colors">
                    <td className="p-3 font-mono">
                      <span className="font-bold text-[#0F1913] block">{order.id}</span>
                      <span className="text-[10px] text-[#565F52]">{order.createdAt.slice(0, 10)}</span>
                    </td>

                    <td className="p-3">
                      <span className="font-bold text-[#0F1913] block">{order.customerName}</span>
                      <span className="text-[11px] text-[#565F52]">{order.city}, {order.state}</span>
                      <span className="text-[10px] text-[#565F52] block font-mono">{order.customerPhone}</span>
                    </td>

                    <td className="p-3">
                      <span className="font-semibold text-[#0F1913]">{order.items.length} SKUs</span>
                      <div className="text-[10px] text-[#565F52] truncate max-w-[150px]">
                        {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="font-bold text-[#0F1913] block">{formatPrice(order.totalAmount)}</span>
                      <span className="text-[10px] text-[#3C6656]">Tax: {formatPrice(order.totalGst)}</span>
                    </td>

                    <td className="p-3">
                      <span className="inline-block bg-[#E4E8D9] text-[#182620] px-2 py-0.5 rounded font-mono uppercase text-[10px] font-semibold">
                        {order.paymentMethod}
                      </span>
                      <span className="block text-[10px] text-[#565F52] truncate max-w-[100px]">
                        Txn: {order.payuTxnId || 'N/A'}
                      </span>
                    </td>

                    <td className="p-3 font-mono">
                      <span className="text-[#3C6656] font-semibold block text-[11px]">
                        {order.courierName || 'Delhivery'}
                      </span>
                      <span className="text-[10px] text-[#A87C1F] font-bold">
                        {order.trackingNumber || 'Unassigned'}
                      </span>
                    </td>

                    <td className="p-3">
                      <select
                        value={order.orderStatus}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value as OrderStatus)
                        }
                        className={`text-xs font-bold px-2 py-1 rounded border border-[#CBCFB9] cursor-pointer ${
                          order.orderStatus === 'delivered'
                            ? 'bg-green-100 text-green-800'
                            : order.orderStatus === 'shipped'
                            ? 'bg-blue-100 text-blue-800'
                            : order.orderStatus === 'packed'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="packed">Packed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </td>

                    <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                      <a
                        href={generateWhatsAppLink(
                          order.customerPhone,
                          order.orderStatus === 'shipped'
                            ? buildOrderShippedMessage(order, whatsappConfig, language === 'bn' ? 'bn' : 'en')
                            : buildOrderPlacedMessage(order, whatsappConfig, language === 'bn' ? 'bn' : 'en')
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-[#EEF0E7] hover:bg-[#25D366] hover:text-white text-[#128C7E] rounded transition-colors inline-block"
                        title="Send WhatsApp Update to Customer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 fill-current" />
                      </a>

                      <button
                        onClick={() => setShowShippingLabel(order)}
                        className="p-1.5 bg-[#EEF0E7] hover:bg-[#CBCFB9] text-[#0F1913] rounded transition-colors inline-block"
                        title="Print Courier Shipping Label & AWB Barcode"
                      >
                        <Truck className="w-3.5 h-3.5 text-[#3C6656]" />
                      </button>

                      <button
                        onClick={() => startEmailForOrder(order)}
                        className="p-1.5 bg-[#EEF0E7] hover:bg-red-100 text-red-700 rounded transition-colors inline-block"
                        title="Send Order Status Email via Gmail"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-1.5 bg-[#EEF0E7] hover:bg-[#CBCFB9] text-[#0F1913] rounded transition-colors inline-block"
                        title="View GST Tax Invoice"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#A87C1F]" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shipping Label Modal */}
      {showShippingLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border-2 border-black rounded p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="border-b-2 border-black pb-3 flex justify-between items-start">
              <div>
                <h3 className="font-mono font-black text-base uppercase tracking-tight">
                  LOGISTICS DISPATCH MANIFEST
                </h3>
                <p className="text-[10px] font-mono">{showShippingLabel.courierName} Surface Express</p>
              </div>
              <div className="text-right font-mono">
                <span className="bg-black text-white px-2 py-0.5 text-xs font-bold">PREPAID</span>
                <p className="text-[10px] mt-1">{showShippingLabel.id}</p>
              </div>
            </div>

            {/* AWB Barcode Simulation */}
            <div className="text-center py-2 bg-gray-50 border border-gray-300 rounded font-mono">
              <div className="text-2xl tracking-[6px] font-barcode font-black">
                ||| | |||| | ||| |||| | | |||
              </div>
              <p className="text-xs font-bold tracking-widest mt-1">
                AWB: {showShippingLabel.trackingNumber}
              </p>
            </div>

            {/* Routing Addresses */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono border-b border-black pb-3">
              <div>
                <span className="font-bold block text-[10px] text-gray-500">FROM (ORIGIN):</span>
                <p className="font-bold text-[11px]">{company.legalName}</p>
                <p className="text-[10px] text-gray-600">Sector V, Kolkata, WB 700091</p>
                <p className="text-[10px]">GST: {company.gstin}</p>
              </div>

              <div>
                <span className="font-bold block text-[10px] text-gray-500">SHIP TO:</span>
                <p className="font-bold text-[11px]">{showShippingLabel.customerName}</p>
                <p className="text-[10px] text-gray-600">{showShippingLabel.shippingAddress}</p>
                <p className="text-[10px] font-bold">
                  {showShippingLabel.city}, {showShippingLabel.state} - {showShippingLabel.pincode}
                </p>
                <p className="text-[10px]">Ph: {showShippingLabel.customerPhone}</p>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-mono">
              <span>Items: {showShippingLabel.items.length} units</span>
              <span>Weight: ~2.40 KG</span>
              <span className="font-bold">Total: {formatPrice(showShippingLabel.totalAmount)}</span>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-black text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Shipping Label</span>
              </button>
              <button
                onClick={() => setShowShippingLabel(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-black rounded text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal for any Order */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white border border-[#CBCFB9] rounded-lg max-w-2xl w-full p-6 shadow-2xl my-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-[#CBCFB9]">
              <h3 className="font-heading font-bold text-base text-[#0F1913]">
                Tax Invoice Preview · {selectedOrder.id}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 hover:bg-[#E4E8D9] rounded"
              >
                ✕
              </button>
            </div>

            {/* Invoice Container */}
            <div className="border border-[#CBCFB9] p-5 rounded text-xs space-y-3 font-sans">
              <div className="flex justify-between items-start border-b border-[#CBCFB9] pb-3">
                <div>
                  <h4 className="font-black text-base text-[#0F1913]">{company.name}</h4>
                  <p className="text-[11px] text-[#565F52]">{company.legalName}</p>
                  <p className="text-[11px] text-[#565F52]">{company.address}</p>
                  <p className="text-[11px] font-bold text-[#0F1913]">GSTIN: {company.gstin}</p>
                </div>
                <div className="text-right">
                  <span className="bg-[#182620] text-[#CC9A2E] px-2 py-0.5 font-bold font-mono text-[10px]">
                    TAX INVOICE
                  </span>
                  <p className="font-mono font-bold mt-1">{selectedOrder.id}</p>
                  <p className="text-[11px] text-[#565F52]">Date: {selectedOrder.createdAt.slice(0, 10)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-[#CBCFB9] pb-3">
                <div>
                  <span className="font-bold text-[#565F52] block">Billed To:</span>
                  <p className="font-semibold">{selectedOrder.customerName}</p>
                  <p>{selectedOrder.shippingAddress}</p>
                  <p>{selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}</p>
                  <p>Ph: {selectedOrder.customerPhone}</p>
                </div>
                <div>
                  <span className="font-bold text-[#565F52] block">Dispatch Info:</span>
                  <p>Carrier: {selectedOrder.courierName}</p>
                  <p className="font-mono">AWB: {selectedOrder.trackingNumber}</p>
                  <p>Status: <span className="font-bold uppercase text-[#3C6656]">{selectedOrder.orderStatus}</span></p>
                </div>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="text-[#565F52] border-b border-[#CBCFB9] text-[10px] uppercase">
                    <th className="py-1">Item</th>
                    <th className="py-1">HSN</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">GST %</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBCFB9]/40">
                  {selectedOrder.items.map((it, i) => (
                    <tr key={i}>
                      <td className="py-1.5 font-medium">{it.name}</td>
                      <td className="py-1.5 font-mono">{it.hsn}</td>
                      <td className="py-1.5 text-center">{it.quantity}</td>
                      <td className="py-1.5 text-right">{formatPrice(it.unitPrice)}</td>
                      <td className="py-1.5 text-right">{it.gstRate}%</td>
                      <td className="py-1.5 text-right font-bold">{formatPrice(it.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-2 border-t border-[#CBCFB9] flex justify-end">
                <div className="w-56 space-y-1 text-right text-[11px]">
                  <div className="flex justify-between">
                    <span>Taxable:</span>
                    <span>{formatPrice(selectedOrder.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (CGST/SGST/IGST):</span>
                    <span>{formatPrice(selectedOrder.totalGst)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-[#0F1913] pt-1 border-t border-[#CBCFB9]">
                    <span>Grand Total:</span>
                    <span className="text-[#3C6656]">{formatPrice(selectedOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-[#182620] hover:bg-[#0F1913] text-white py-2.5 rounded text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-[#CC9A2E]" />
                <span>Print GST Invoice</span>
              </button>
              <button
                onClick={() => {
                  const ord = selectedOrder;
                  setSelectedOrder(null);
                  startEmailForOrder(ord);
                }}
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Email Invoice to Customer via Gmail"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email via Gmail</span>
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 bg-[#E4E8D9] hover:bg-[#CBCFB9] text-[#0F1913] rounded text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EMAIL COMPOSER MODAL FOR ORDER */}
      {/* ========================================================= */}
      {emailingOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-[#CBCFB9] rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#0F1913] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#CC9A2E]" />
                <h3 className="font-bold text-sm">Send Order Update via Gmail API</h3>
              </div>
              <button
                onClick={() => setEmailingOrder(null)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setConfirmSendOpen(true);
              }}
              className="p-4 space-y-3 flex-1 overflow-y-auto"
            >
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#565F52] mb-1">
                  Recipient (Customer Email)
                </label>
                <input
                  type="email"
                  required
                  value={emailingOrder.customerEmail}
                  readOnly
                  className="w-full text-xs bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913] font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#565F52] mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2 text-[#0F1913] focus:outline-none focus:border-[#A87C1F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#565F52] mb-1">
                  Message Content
                </label>
                <textarea
                  rows={8}
                  required
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2 font-sans focus:outline-none focus:border-[#A87C1F] leading-relaxed"
                />
              </div>

              <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  This email will be dispatched directly through your connected Gmail account ({company.emailGmail}). You will be asked to confirm before the email is sent.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailingOrder(null)}
                  className="px-4 py-2 border border-[#CBCFB9] rounded text-xs font-semibold text-[#565F52] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="bg-[#0F1913] hover:bg-[#182620] text-white px-5 py-2 rounded text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                >
                  <Send className="w-3.5 h-3.5 text-[#CC9A2E]" />
                  <span>Review &amp; Send</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MANDATORY EXPLICIT CONFIRMATION DIALOG */}
      {/* ========================================================= */}
      {confirmSendOpen && emailingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-amber-500 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-900">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F1913]">Confirm Email Dispatch</h3>
                <p className="text-xs text-[#565F52]">Action will send an email from your Gmail account</p>
              </div>
            </div>

            <div className="bg-[#FBFAF5] p-3 rounded-lg border border-[#CBCFB9] text-xs space-y-1 font-mono">
              <p>To: <strong>{emailingOrder.customerEmail}</strong></p>
              <p>Subject: <strong>{emailSubject}</strong></p>
            </div>

            <p className="text-xs text-[#565F52] leading-relaxed">
              Are you sure you want to send this order update email to {emailingOrder.customerName}? The customer will receive this message in their inbox immediately.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSendOpen(false)}
                className="px-4 py-2 border border-[#CBCFB9] rounded text-xs font-semibold text-[#565F52] hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSendEmail}
                disabled={isSendingEmail}
                className="bg-[#0F1913] hover:bg-[#182620] text-white px-5 py-2 rounded text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-[0.98]"
              >
                <Send className="w-3.5 h-3.5 text-[#CC9A2E]" />
                <span>{isSendingEmail ? 'Dispatching...' : 'Confirm & Send Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
