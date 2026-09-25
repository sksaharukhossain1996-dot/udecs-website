import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  Bell,
  Mail,
  Smartphone,
  Send,
  CheckCircle,
  Users,
  Megaphone,
  Radio,
} from 'lucide-react';

export const AdminNotifications: React.FC = () => {
  const { notifications, sendNotification, orders, company, language } = useStore();
  const [broadcastChannel, setBroadcastChannel] = useState<'sms' | 'email'>('sms');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Send to broadcast list
    sendNotification(
      broadcastChannel,
      'ALL_REGISTERED_CUSTOMERS (Bulk Broadcast)',
      subject || (broadcastChannel === 'email' ? 'Exclusive Wholesale Offer' : 'SMS Notification'),
      message
    );

    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      setSubject('');
      setMessage('');
    }, 2000);
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBCFB9]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0F1913]">
            {language === 'bn'
              ? 'স্বয়ংক্রিয় SMS ও ইমেইল নোটিফিকেশন হাব'
              : 'Automated SMS & Email Notification System'}
          </h1>
          <p className="text-xs text-[#565F52] mt-0.5">
            Real-time order status dispatch triggers and promotional marketing campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-[#E4E8D9] text-[#182620] px-2.5 py-1 rounded font-bold">
            Total Dispatched: {notifications.length} Logs
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Broadcast Composer */}
        <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#CBCFB9]">
            <Megaphone className="w-4 h-4 text-[#A87C1F]" />
            <h3 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider">
              Promotional Campaign Broadcast
            </h3>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-[#0F1913] mb-1">
                Select Dispatch Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBroadcastChannel('sms')}
                  className={`p-2.5 rounded font-bold border flex items-center justify-center gap-2 transition-all ${
                    broadcastChannel === 'sms'
                      ? 'bg-[#182620] text-white border-[#182620]'
                      : 'bg-[#FBFAF5] text-[#565F52] border-[#CBCFB9]'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Bulk SMS Gateway</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBroadcastChannel('email')}
                  className={`p-2.5 rounded font-bold border flex items-center justify-center gap-2 transition-all ${
                    broadcastChannel === 'email'
                      ? 'bg-[#182620] text-white border-[#182620]'
                      : 'bg-[#FBFAF5] text-[#565F52] border-[#CBCFB9]'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Email Campaign</span>
                </button>
              </div>
            </div>

            {broadcastChannel === 'email' && (
              <div>
                <label className="block font-bold text-[#0F1913] mb-1">
                  Email Subject Line *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special 15% Festive Discount on Kitchenware at udecs.store"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913] focus:outline-none focus:border-[#A87C1F]"
                />
              </div>
            )}

            <div>
              <label className="block font-bold text-[#0F1913] mb-1">
                Campaign Message Body *
              </label>
              <textarea
                rows={5}
                required
                placeholder={
                  broadcastChannel === 'sms'
                    ? 'Dear Customer, explore exclusive B2B wholesale pallets and sports gear at udecs.store. Pay via PayU or COD. Support: +91 9845485437.'
                    : 'Dear Valued Merchant, UNICK DIGITAL E-COMMERCE SOLUTIONS offers wholesale cartons at direct factory rates. GST invoice input tax credit included...'
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913] focus:outline-none focus:border-[#A87C1F]"
              />
              <span className="text-[10px] text-[#565F52] mt-1 block">
                Targeting: All verified customer phone numbers and emails in store database.
              </span>
            </div>

            <button
              type="submit"
              className="w-full bg-[#0F1913] hover:bg-[#182620] text-white py-2.5 rounded font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Send className="w-3.5 h-3.5 text-[#CC9A2E]" />
              <span>
                {isSent
                  ? 'Campaign Dispatched Successfully!'
                  : `Dispatch ${broadcastChannel.toUpperCase()} Broadcast`}
              </span>
            </button>
          </form>
        </div>

        {/* Right Column: Outgoing Logs */}
        <div className="lg:col-span-7 bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#CBCFB9] mb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#3C6656]" />
                <h3 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider">
                  Automated Gateway Notification Logs
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#3C6656] font-bold">
                100% Delivery Rate
              </span>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-3 rounded bg-[#FBFAF5] border border-[#CBCFB9] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                          notif.type === 'sms'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {notif.type}
                      </span>
                      <span className="font-bold text-[#0F1913]">{notif.recipient}</span>
                    </div>
                    <span className="text-[10px] text-[#565F52] font-mono">
                      {notif.timestamp.slice(11, 19)}
                    </span>
                  </div>

                  {notif.subject && (
                    <p className="font-semibold text-[#0F1913] text-[11px]">{notif.subject}</p>
                  )}
                  <p className="text-[#565F52] text-[11px] leading-relaxed whitespace-pre-line">
                    {notif.body}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[9px] text-[#3C6656]">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Carrier Ack: DELIVERED
                    </span>
                    <span className="text-[#565F52] font-mono">{notif.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
