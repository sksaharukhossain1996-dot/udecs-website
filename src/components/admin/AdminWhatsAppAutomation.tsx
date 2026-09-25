import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Copy,
  ExternalLink,
  Check,
  Smartphone,
  Phone,
  Settings,
  Bell,
  Sliders,
  Radio,
  Clock,
  User,
  Zap,
} from 'lucide-react';
import {
  renderWhatsAppTemplate,
  generateWhatsAppLink,
  getWhatsAppStatus,
  sendAutomatedWhatsAppApi,
} from '../../services/whatsappService';
import { getApiUrl } from '../../services/api';

export const AdminWhatsAppAutomation: React.FC = () => {
  const {
    company,
    language,
    whatsappConfig,
    updateWhatsAppConfig,
    notifications,
    sendNotification,
    orders,
    addAuditLog,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'simulator' | 'templates' | 'logs' | 'webhook'>('overview');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [gatewayConfigured, setGatewayConfigured] = useState(false);

  // Simulator State
  const [selectedTemplate, setSelectedTemplate] = useState<
    'orderPlaced' | 'orderShipped' | 'orderDelivered' | 'lowStock' | 'custom'
  >('orderPlaced');
  const [simPhone, setSimPhone] = useState('9845485437');
  const [simName, setSimName] = useState('Anirban Mukherjee');
  const [simAmount, setSimAmount] = useState('2499');
  const [simOrderId, setSimOrderId] = useState('UDECS-ORD-4821');
  const [simCourier, setSimCourier] = useState('Delhivery Express Cargo');
  const [simTracking, setSimTracking] = useState('DEL982417032IN');
  const [simCustomText, setSimCustomText] = useState(
    'নমস্কার! UNICK DIGITAL (udecs.store)-এ আপনার জন্য বিশেষ ১০% ডিসকাউন্ট রয়েছে। ক্যাটালগ দেখুন: udecs.store'
  );
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Template Editing State
  const [templatesForm, setTemplatesForm] = useState(whatsappConfig.templates);

  useEffect(() => {
    getWhatsAppStatus()
      .then(({ configured }) => {
        setGatewayConfigured(configured);
        updateWhatsAppConfig({ isActive: false, gatewayStatus: 'paused' });
      })
      .catch(() => {
        setGatewayConfigured(false);
        updateWhatsAppConfig({ isActive: false, gatewayStatus: 'paused' });
      });
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copied ${key} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Compute live preview text in simulator
  const getPreviewText = (): string => {
    if (selectedTemplate === 'custom') return simCustomText;
    if (selectedTemplate === 'orderPlaced') {
      return renderWhatsAppTemplate(whatsappConfig.templates.orderPlacedBn, {
        customerName: simName,
        orderId: simOrderId,
        totalAmount: simAmount,
        paymentMethod: 'PayU (UPI / NetBanking)',
        deliveryAddress: 'Pratappur, Panskura, Purba Medinipur, WB - 721152',
      });
    }
    if (selectedTemplate === 'orderShipped') {
      return renderWhatsAppTemplate(whatsappConfig.templates.orderShippedBn, {
        customerName: simName,
        orderId: simOrderId,
        courierName: simCourier,
        trackingNumber: simTracking,
      });
    }
    if (selectedTemplate === 'orderDelivered') {
      return renderWhatsAppTemplate(whatsappConfig.templates.orderDeliveredBn, {
        customerName: simName,
        orderId: simOrderId,
      });
    }
    if (selectedTemplate === 'lowStock') {
      return renderWhatsAppTemplate(whatsappConfig.templates.lowStockAlertBn, {
        productName: 'Non-Stick Cookware Frypan Set (3 Pcs)',
        sku: 'KT-104',
        stock: '3',
        minStockAlert: '10',
      });
    }
    return '';
  };

  const previewMessage = getPreviewText();
  const directWhatsAppLink = generateWhatsAppLink(simPhone, previewMessage);
  const webhookCallbackUrl = getApiUrl('/api/whatsapp/webhook');

  // Send Test Message
  const handleSendTest = async () => {
    setIsSending(true);
    setSendResult(null);
    try {
      const res = await sendAutomatedWhatsAppApi({
        to: simPhone,
        message: previewMessage,
        templateType: selectedTemplate,
        orderId: simOrderId,
        customerName: simName,
      });

      sendNotification(
        'whatsapp',
        `+91 ${simPhone.replace(/[^0-9]/g, '')}`,
        `WhatsApp Test: ${selectedTemplate.toUpperCase()}`,
        previewMessage
      );

      updateWhatsAppConfig({
        totalDispatchedCount: (whatsappConfig.totalDispatchedCount || 0) + 1,
      });

      addAuditLog({
        action: 'WHATSAPP_AUTO_DISPATCH',
        module: 'WHATSAPP_AUTOMATION',
        details: `Meta accepted test ${selectedTemplate} message to +91 ${simPhone}. Status: ${res.status}; delivery is unconfirmed.`,
      });

      setSendResult({
        success: true,
        msg: `Meta accepted the message request (${res.messageId}). This does not confirm delivery.`,
      });
      showToast('Meta accepted the WhatsApp message request.');
    } catch (err: any) {
      setSendResult({
        success: false,
        msg: err?.message || 'Meta did not accept the message request.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveTemplates = (e: React.FormEvent) => {
    e.preventDefault();
    updateWhatsAppConfig({ templates: templatesForm });
    showToast('Custom WhatsApp templates saved successfully!');
    addAuditLog({
      action: 'WHATSAPP_TEMPLATES_UPDATED',
      module: 'WHATSAPP_AUTOMATION',
      details: 'Updated WhatsApp auto-response and order dispatch templates',
    });
  };

  // Filter WhatsApp notifications from log
  const whatsAppLogs = notifications.filter(
    (n) => n.channel === 'whatsapp' || n.type === 'order_placed' || n.type === 'order_shipped'
  );

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#182620] text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 border border-[#25D366] animate-slideIn">
          <CheckCircle2 className="w-5 h-5 text-[#25D366]" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#CBCFB9]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center text-[#25D366]">
              <MessageSquare className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0F1913] flex items-center gap-3">
                {language === 'bn' ? 'হোয়াটসঅ্যাপ অটোমেশন হাব' : 'WhatsApp Automation Hub'}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase ${
                    gatewayConfigured
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-zinc-100 text-zinc-600 border border-zinc-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      gatewayConfigured ? 'bg-[#25D366]' : 'bg-zinc-400'
                    }`}
                  />
                  {gatewayConfigured ? 'MANUAL SEND ONLY' : 'NOT CONFIGURED'}
                </span>
              </h1>
              <p className="text-xs text-[#565F52] mt-0.5">
                This panel supports authorized manual sends only. Storefront event automation is not implemented; direct wa.me messaging remains available.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Automation Stats */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-white border border-[#CBCFB9] px-3.5 py-1.5 rounded-lg text-right">
            <span className="text-[10px] text-[#565F52] block uppercase font-bold tracking-wider">
              Accepted Requests
            </span>
            <span className="text-sm font-black font-mono text-[#0F1913]">
              {whatsappConfig.totalDispatchedCount} Messages
            </span>
          </div>

          <button
            disabled
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-xs disabled:cursor-not-allowed disabled:opacity-50 ${
              'bg-zinc-500 text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              {!gatewayConfigured ? 'Meta API not configured' : 'Automation not implemented'}
            </span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#CBCFB9] overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-t-lg font-bold text-xs flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'overview'
              ? 'border-[#25D366] text-[#0F1913] bg-white'
              : 'border-transparent text-[#565F52] hover:text-[#0F1913]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-[#25D366]" />
          <span>Automation Switches & Triggers</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-3.5 py-2 rounded-t-lg font-bold text-xs flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'simulator'
              ? 'border-[#25D366] text-[#0F1913] bg-white'
              : 'border-transparent text-[#565F52] hover:text-[#0F1913]'
          }`}
        >
          <Send className="w-3.5 h-3.5 text-[#A87C1F]" />
          <span>Live Message Tester & Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`px-3.5 py-2 rounded-t-lg font-bold text-xs flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'templates'
              ? 'border-[#25D366] text-[#0F1913] bg-white'
              : 'border-transparent text-[#565F52] hover:text-[#0F1913]'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-[#3C6656]" />
          <span>Bilingual Message Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-3.5 py-2 rounded-t-lg font-bold text-xs flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'logs'
              ? 'border-[#25D366] text-[#0F1913] bg-white'
              : 'border-transparent text-[#565F52] hover:text-[#0F1913]'
          }`}
        >
          <Bell className="w-3.5 h-3.5 text-blue-600" />
          <span>Dispatch History ({whatsAppLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('webhook')}
          className={`px-3.5 py-2 rounded-t-lg font-bold text-xs flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'webhook'
              ? 'border-[#25D366] text-[#0F1913] bg-white'
              : 'border-transparent text-[#565F52] hover:text-[#0F1913]'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-purple-600" />
          <span>Meta Cloud API & Webhooks</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & AUTOMATION TRIGGERS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Status Banner */}
          <div className="bg-gradient-to-r from-[#182620] to-[#0F1913] text-white p-5 rounded-xl border border-[#25D366]/40 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${gatewayConfigured ? 'bg-[#25D366]' : 'bg-amber-400'}`} />
                  <span className={`text-xs font-mono font-bold uppercase tracking-wider ${gatewayConfigured ? 'text-[#25D366]' : 'text-amber-400'}`}>
                    {gatewayConfigured ? 'Meta API configured' : 'Meta API not configured'}
                  </span>
                </div>
                <h3 className="text-lg font-black font-heading text-white">
                  UNICK DIGITAL E-COMMERCE SOLUTIONS · WhatsApp Engine
                </h3>
                <p className="text-xs text-[#B9BFAE] max-w-2xl">
                  Manual sends require an authorized Firebase admin and configured Meta sender. Storefront order triggers and inbound auto-replies are not connected yet.
                </p>
              </div>

              <div className="bg-white/10 p-3 rounded-lg border border-white/10 text-center shrink-0">
                <span className="text-[10px] text-[#B9BFAE] block uppercase">Gateway Protocol</span>
                <span className="text-xs font-mono font-bold text-[#25D366] block">Meta Cloud API 2026</span>
                <span className="text-[9px] text-[#B9BFAE]/80">Meta acceptance is not delivery confirmation</span>
              </div>
            </div>
          </div>

          {/* Trigger Toggles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Trigger 1: Order Placement */}
            <div className="bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#3C6656] bg-[#E4E8D9] px-2 py-0.5 rounded">
                    TRIGGER #1
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappConfig.autoSendOnOrderPlaced}
                      onChange={(e) =>
                        updateWhatsAppConfig({ autoSendOnOrderPlaced: e.target.checked })
                      }
                      disabled
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#25D366]"></div>
                  </label>
                </div>
                <h4 className="font-heading font-bold text-sm text-[#0F1913]">
                  অর্ডার নিশ্চিতকরণ অটো-সেন্ড (Order Placement)
                </h4>
                <p className="text-xs text-[#565F52]">
                  Not implemented: an order-created event could send the order summary and payment details after server-side order integration is added.
                </p>
              </div>
              <div className="pt-2 border-t border-[#CBCFB9] flex items-center justify-between text-[11px] text-[#565F52]">
                <span>Recipient: Customer Phone</span>
                <span className="font-bold text-[#3C6656]">Not connected yet</span>
              </div>
            </div>

            {/* Trigger 2: Order Shipped */}
            <div className="bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#A87C1F] bg-[#FBFAF5] px-2 py-0.5 rounded border border-[#CBCFB9]">
                    TRIGGER #2
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappConfig.autoSendOnOrderShipped}
                      onChange={(e) =>
                        updateWhatsAppConfig({ autoSendOnOrderShipped: e.target.checked })
                      }
                      disabled
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#25D366]"></div>
                  </label>
                </div>
                <h4 className="font-heading font-bold text-sm text-[#0F1913]">
                  শিপমেন্ট ও AWB ট্র্যাকিং অটো-সেন্ড (Order Shipped)
                </h4>
                <p className="text-xs text-[#565F52]">
                  Not implemented: shipment details and a tracking URL could be sent after courier-status events are securely integrated.
                </p>
              </div>
              <div className="pt-2 border-t border-[#CBCFB9] flex items-center justify-between text-[11px] text-[#565F52]">
                <span>Recipient: Customer Phone</span>
                <span className="font-bold text-[#A87C1F]">Not connected yet</span>
              </div>
            </div>

            {/* Trigger 3: Order Delivered */}
            <div className="bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    TRIGGER #3
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappConfig.autoSendOnOrderDelivered}
                      onChange={(e) =>
                        updateWhatsAppConfig({ autoSendOnOrderDelivered: e.target.checked })
                      }
                      disabled
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#25D366]"></div>
                  </label>
                </div>
                <h4 className="font-heading font-bold text-sm text-[#0F1913]">
                  ডেলিভারি কনফার্মেশন ও রিভিউ (Order Delivered)
                </h4>
                <p className="text-xs text-[#565F52]">
                  Not implemented: delivery confirmation and review requests require a server-side courier event integration.
                </p>
              </div>
              <div className="pt-2 border-t border-[#CBCFB9] flex items-center justify-between text-[11px] text-[#565F52]">
                <span>Recipient: Customer Phone</span>
                <span className="font-bold text-blue-700">Not connected yet</span>
              </div>
            </div>

            {/* Trigger 4: Low Stock Alert to Owner */}
            <div className="bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    TRIGGER #4
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappConfig.autoSendLowStockAlert}
                      onChange={(e) =>
                        updateWhatsAppConfig({ autoSendLowStockAlert: e.target.checked })
                      }
                      disabled
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#25D366]"></div>
                  </label>
                </div>
                <h4 className="font-heading font-bold text-sm text-[#0F1913]">
                  জরুরি লো-স্টক সতর্কতা (Admin Low Stock)
                </h4>
                <p className="text-xs text-[#565F52]">
                  Not implemented: inventory changes are not connected to server-side WhatsApp alerts.
                </p>
              </div>
              <div className="pt-2 border-t border-[#CBCFB9] flex items-center justify-between text-[11px] text-[#565F52]">
                <span>Recipient: {whatsappConfig.ownerAlertNumber}</span>
                <span className="font-bold text-red-700">Not connected yet</span>
              </div>
            </div>

            {/* Trigger 5: Gemini AI Auto-Reply Bot */}
            <div className="bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    GEMINI AI BOT
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappConfig.autoAiAssistantReply}
                      onChange={(e) =>
                        updateWhatsAppConfig({ autoAiAssistantReply: e.target.checked })
                      }
                      disabled
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#25D366]"></div>
                  </label>
                </div>
                <h4 className="font-heading font-bold text-sm text-[#0F1913]">
                  স্মার্ট এআই অটো-রিপ্লাই (Gemini 2.5 Flash)
                </h4>
                <p className="text-xs text-[#565F52]">
                  Not implemented: verified webhook callbacks are acknowledged, but customer messages are not processed or answered.
                </p>
              </div>
              <div className="pt-2 border-t border-[#CBCFB9] flex items-center justify-between text-[11px] text-[#565F52]">
                <span>Model: Gemini 2.5 Flash</span>
                <span className="font-bold text-zinc-600">Inbound replies not implemented</span>
              </div>
            </div>

            {/* Trigger 6: 1-Click WhatsApp Direct Buy */}
            <div className="bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded border border-[#25D366]/30">
                    STOREFRONT 1-CLICK
                  </span>
                  <span className="text-[10px] font-bold text-[#25D366] bg-emerald-100 px-2 py-0.5 rounded">
                    ACTIVE
                  </span>
                </div>
                <h4 className="font-heading font-bold text-sm text-[#0F1913]">
                  হোয়াটসঅ্যাপ কুইক বাই বোতাম (Quick Order)
                </h4>
                <p className="text-xs text-[#565F52]">
                  Enables "Order on WhatsApp" 1-click button on product pages and cart, allowing buyers to complete checkout directly in WhatsApp chat.
                </p>
              </div>
              <div className="pt-2 border-t border-[#CBCFB9] flex items-center justify-between text-[11px] text-[#565F52]">
                <span>Target: Official WhatsApp</span>
                <span className="font-bold text-[#25D366]">Ready on Store</span>
              </div>
            </div>
          </div>

          {/* Quick Business Routing Configuration */}
          <div className="bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs space-y-4">
            <h3 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#25D366]" />
              Business Routing Phone Numbers
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#0F1913] mb-1">
                  Customer Support WhatsApp Number (Inbound & Outbound)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={company.whatsapp}
                    readOnly
                    className="flex-1 bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913] font-mono"
                  />
                  <button
                    onClick={() => handleCopy(company.whatsapp, 'WhatsApp Number')}
                    className="px-3 bg-[#EEF0E7] hover:bg-[#E4E8D9] rounded border border-[#CBCFB9] text-[#182620] font-bold flex items-center gap-1.5"
                  >
                    {copiedKey === 'WhatsApp Number' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'WhatsApp Number' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <span className="text-[10px] text-[#565F52] mt-1 block">
                  Displayed across customer storefront, invoice footers, and contact widgets.
                </span>
              </div>

              <div>
                <label className="block font-bold text-[#0F1913] mb-1">
                  Owner Escalation & Warehouse Alert Number (SK Saharuk Hossain)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={whatsappConfig.ownerAlertNumber}
                    onChange={(e) =>
                      updateWhatsAppConfig({ ownerAlertNumber: e.target.value })
                    }
                    className="flex-1 bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913] font-mono"
                  />
                  <button
                    onClick={() => handleCopy(whatsappConfig.ownerAlertNumber, 'Owner Number')}
                    className="px-3 bg-[#EEF0E7] hover:bg-[#E4E8D9] rounded border border-[#CBCFB9] text-[#182620] font-bold flex items-center gap-1.5"
                  >
                    {copiedKey === 'Owner Number' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'Owner Number' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <span className="text-[10px] text-[#565F52] mt-1 block">
                  Receives automated low-stock warnings, high-value bulk orders, and system alerts.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE MESSAGE TESTER & SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-6 bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#CBCFB9]">
              <Send className="w-4 h-4 text-[#A87C1F]" />
              <h3 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider">
                Automated Message Dispatch Tester
              </h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#0F1913] mb-1">
                  Select Notification Event Template
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('orderPlaced')}
                    className={`p-2.5 rounded font-bold border text-left transition-all ${
                      selectedTemplate === 'orderPlaced'
                        ? 'bg-[#182620] text-white border-[#182620]'
                        : 'bg-[#FBFAF5] text-[#565F52] border-[#CBCFB9]'
                    }`}
                  >
                    <span className="block text-[11px]">📦 Order Placed</span>
                    <span className="text-[9px] opacity-75 font-normal">অর্ডার নিশ্চিতকরণ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('orderShipped')}
                    className={`p-2.5 rounded font-bold border text-left transition-all ${
                      selectedTemplate === 'orderShipped'
                        ? 'bg-[#182620] text-white border-[#182620]'
                        : 'bg-[#FBFAF5] text-[#565F52] border-[#CBCFB9]'
                    }`}
                  >
                    <span className="block text-[11px]">🚚 Order Shipped</span>
                    <span className="text-[9px] opacity-75 font-normal">AWB ট্র্যাকিং</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('orderDelivered')}
                    className={`p-2.5 rounded font-bold border text-left transition-all ${
                      selectedTemplate === 'orderDelivered'
                        ? 'bg-[#182620] text-white border-[#182620]'
                        : 'bg-[#FBFAF5] text-[#565F52] border-[#CBCFB9]'
                    }`}
                  >
                    <span className="block text-[11px]">🎉 Delivered</span>
                    <span className="text-[9px] opacity-75 font-normal">ডেলিভারি সম্পন্ন</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('lowStock')}
                    className={`p-2.5 rounded font-bold border text-left transition-all ${
                      selectedTemplate === 'lowStock'
                        ? 'bg-[#182620] text-white border-[#182620]'
                        : 'bg-[#FBFAF5] text-[#565F52] border-[#CBCFB9]'
                    }`}
                  >
                    <span className="block text-[11px]">⚠️ Low Stock Alert</span>
                    <span className="text-[9px] opacity-75 font-normal">জরুরি স্টক অ্যালার্ট</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0F1913] mb-1">
                    Customer Phone Number *
                  </label>
                  <div className="flex items-center bg-[#FBFAF5] border border-[#CBCFB9] rounded px-2">
                    <span className="text-xs font-mono font-bold text-[#565F52] mr-1">+91</span>
                    <input
                      type="text"
                      value={simPhone}
                      onChange={(e) => setSimPhone(e.target.value)}
                      placeholder="9845485437"
                      className="w-full py-2 bg-transparent text-[#0F1913] font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#0F1913] mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913] focus:outline-none"
                  />
                </div>
              </div>

              {selectedTemplate === 'orderPlaced' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#0F1913] mb-1">
                      Order ID
                    </label>
                    <input
                      type="text"
                      value={simOrderId}
                      onChange={(e) => setSimOrderId(e.target.value)}
                      className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#0F1913] mb-1">
                      Order Amount (₹)
                    </label>
                    <input
                      type="text"
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913] font-mono"
                    />
                  </div>
                </div>
              )}

              {selectedTemplate === 'orderShipped' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#0F1913] mb-1">
                      Courier Partner Name
                    </label>
                    <input
                      type="text"
                      value={simCourier}
                      onChange={(e) => setSimCourier(e.target.value)}
                      className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#0F1913] mb-1">
                      Tracking AWB Number
                    </label>
                    <input
                      type="text"
                      value={simTracking}
                      onChange={(e) => setSimTracking(e.target.value)}
                      className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913] font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  disabled={isSending || !gatewayConfigured}
                  onClick={handleSendTest}
                  className="flex-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white py-2.5 rounded font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSending
                      ? 'Sending...'
                      : gatewayConfigured
                      ? 'Send via Meta Cloud API'
                      : 'Meta credentials required'}
                  </span>
                </button>

                <a
                  href={directWhatsAppLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-[#182620] hover:bg-[#0F1913] text-white rounded font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open WhatsApp Web</span>
                </a>
              </div>

              {/* Result Notice */}
              {sendResult && (
                <div
                  className={`p-3 rounded text-xs font-semibold flex items-center gap-2 ${
                    sendResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{sendResult.msg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Visual WhatsApp Chat Simulator Preview */}
          <div className="lg:col-span-6 bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#CBCFB9]">
              <span className="font-heading font-bold text-xs uppercase tracking-wider text-[#0F1913] flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#25D366]" />
                Customer Phone Screen Preview
              </span>
              <span className="text-[10px] text-[#565F52] font-mono">
                Recipient: +91 {simPhone}
              </span>
            </div>

            {/* Smartphone UI Shell */}
            <div className="mt-4 flex-1 bg-[#ECE5DD] rounded-xl border-4 border-[#222E35] overflow-hidden flex flex-col shadow-inner">
              {/* WhatsApp App Bar */}
              <div className="bg-[#075E54] text-white p-2.5 flex items-center gap-2.5 shadow-xs">
                <div className="w-8 h-8 rounded-full bg-[#128C7E] flex items-center justify-center font-bold text-xs">
                  U
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold block truncate">
                    UDECS · Unick Digital
                  </span>
                  <span className="text-[10px] text-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]"></span> Official Business Account
                  </span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Phone className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Chat Canvas */}
              <div className="p-3.5 flex-1 flex flex-col justify-end space-y-3 font-sans">
                {/* Message Bubble */}
                <div className="self-start max-w-[92%] bg-white rounded-lg rounded-tl-none p-3 shadow-xs text-xs text-[#111B21] leading-relaxed relative">
                  <div className="text-[10px] font-bold text-[#075E54] mb-1">
                    UNICK DIGITAL E-COMMERCE SOLUTIONS
                  </div>
                  <pre className="font-sans whitespace-pre-wrap text-[11.5px] text-[#111B21]">
                    {previewMessage}
                  </pre>
                  <div className="flex items-center justify-end gap-1 mt-1.5 text-[9px] text-[#667781]">
                    <span>
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[#53BDEB] font-bold">✓✓</span>
                  </div>
                </div>
              </div>

              {/* Mock Chat Input Footer */}
              <div className="bg-[#F0F2F5] p-2 flex items-center gap-2 border-t border-[#D1D7DB] text-xs text-[#8696A0]">
                <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[11px] text-[#54656F]">
                  Type a reply...
                </div>
                <div className="w-7 h-7 rounded-full bg-[#00A884] text-white flex items-center justify-center">
                  <Send className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BILINGUAL TEMPLATES EDITOR */}
      {activeTab === 'templates' && (
        <form onSubmit={handleSaveTemplates} className="space-y-6">
          <div className="bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#CBCFB9]">
              <div>
                <h3 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider">
                  Automated Template Manager
                </h3>
                <p className="text-xs text-[#565F52]">
                  Available tokens: <code className="bg-[#FBFAF5] px-1 py-0.5 rounded border border-[#CBCFB9] font-mono">{'{customerName}'}</code>, <code className="bg-[#FBFAF5] px-1 py-0.5 rounded border border-[#CBCFB9] font-mono">{'{orderId}'}</code>, <code className="bg-[#FBFAF5] px-1 py-0.5 rounded border border-[#CBCFB9] font-mono">{'{totalAmount}'}</code>, <code className="bg-[#FBFAF5] px-1 py-0.5 rounded border border-[#CBCFB9] font-mono">{'{paymentMethod}'}</code>, <code className="bg-[#FBFAF5] px-1 py-0.5 rounded border border-[#CBCFB9] font-mono">{'{courierName}'}</code>, <code className="bg-[#FBFAF5] px-1 py-0.5 rounded border border-[#CBCFB9] font-mono">{'{trackingNumber}'}</code>.
                </p>
              </div>

              <button
                type="submit"
                className="bg-[#182620] hover:bg-[#0F1913] text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Check className="w-3.5 h-3.5 text-[#25D366]" />
                <span>Save Template Changes</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* Order Placed Bengali */}
              <div>
                <label className="block font-bold text-[#0F1913] mb-1">
                  1. Order Placed Confirmation (বাংলা)
                </label>
                <textarea
                  rows={8}
                  value={templatesForm.orderPlacedBn}
                  onChange={(e) =>
                    setTemplatesForm({ ...templatesForm, orderPlacedBn: e.target.value })
                  }
                  className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2.5 text-[#0F1913] font-mono text-[11px] focus:outline-none focus:border-[#25D366]"
                />
              </div>

              {/* Order Placed English */}
              <div>
                <label className="block font-bold text-[#0F1913] mb-1">
                  2. Order Placed Confirmation (English)
                </label>
                <textarea
                  rows={8}
                  value={templatesForm.orderPlacedEn}
                  onChange={(e) =>
                    setTemplatesForm({ ...templatesForm, orderPlacedEn: e.target.value })
                  }
                  className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2.5 text-[#0F1913] font-mono text-[11px] focus:outline-none focus:border-[#25D366]"
                />
              </div>

              {/* Order Shipped Bengali */}
              <div>
                <label className="block font-bold text-[#0F1913] mb-1">
                  3. Order Shipped & AWB Tracking (বাংলা)
                </label>
                <textarea
                  rows={7}
                  value={templatesForm.orderShippedBn}
                  onChange={(e) =>
                    setTemplatesForm({ ...templatesForm, orderShippedBn: e.target.value })
                  }
                  className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2.5 text-[#0F1913] font-mono text-[11px] focus:outline-none focus:border-[#25D366]"
                />
              </div>

              {/* Order Shipped English */}
              <div>
                <label className="block font-bold text-[#0F1913] mb-1">
                  4. Order Shipped & AWB Tracking (English)
                </label>
                <textarea
                  rows={7}
                  value={templatesForm.orderShippedEn}
                  onChange={(e) =>
                    setTemplatesForm({ ...templatesForm, orderShippedEn: e.target.value })
                  }
                  className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2.5 text-[#0F1913] font-mono text-[11px] focus:outline-none focus:border-[#25D366]"
                />
              </div>

              {/* Low Stock Alert */}
              <div className="md:col-span-2">
                <label className="block font-bold text-[#0F1913] mb-1">
                  5. Admin Low Stock Alert (Owner WhatsApp Alert)
                </label>
                <textarea
                  rows={5}
                  value={templatesForm.lowStockAlertBn}
                  onChange={(e) =>
                    setTemplatesForm({ ...templatesForm, lowStockAlertBn: e.target.value })
                  }
                  className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2.5 text-[#0F1913] font-mono text-[11px] focus:outline-none focus:border-[#25D366]"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 4: DISPATCH LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#CBCFB9]">
            <h3 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider">
              Automated WhatsApp Dispatch Logs ({whatsAppLogs.length})
            </h3>
            <span className="text-[10px] text-[#565F52]">
              Delivery results are unavailable until Meta integration is configured.
            </span>
          </div>

          {whatsAppLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#565F52]">
              No successful WhatsApp sends are recorded. Direct wa.me messaging is available; automated delivery is not configured.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FBFAF5] border-b border-[#CBCFB9] text-[#565F52] uppercase font-bold text-[10px]">
                    <th className="p-3">Log ID</th>
                    <th className="p-3">Channel / Type</th>
                    <th className="p-3">Recipient Phone</th>
                    <th className="p-3">Message Snippet</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3 text-right">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBCFB9]">
                  {whatsAppLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#FBFAF5]/60 transition-colors">
                      <td className="p-3 font-mono text-[11px] font-bold text-[#0F1913]">
                        {log.id}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] text-[#25D366] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <MessageSquare className="w-3 h-3" />
                          {log.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-semibold text-[#0F1913]">
                        {log.recipient}
                      </td>
                      <td className="p-3 text-[#565F52] max-w-xs truncate" title={log.message}>
                        {log.message}
                      </td>
                      <td className="p-3 text-[11px] text-[#565F52] font-mono">
                        {log.timestamp}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full ${
                          log.status === 'sent'
                            ? 'text-emerald-800 bg-emerald-100'
                            : 'text-red-800 bg-red-100'
                        }`}>
                          {log.status === 'sent' ? <Check className="w-3 h-3 text-emerald-600" /> : <AlertTriangle className="w-3 h-3 text-red-600" />}
                          {log.status === 'sent' ? 'Accepted; delivery unknown' : log.status === 'queued' ? 'Queued' : 'Not sent'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: META CLOUD API & WEBHOOKS */}
      {activeTab === 'webhook' && (
        <div className="bg-amber-50 p-5 rounded-lg border border-amber-200 shadow-xs space-y-2 text-sm text-amber-950">
          <h3 className="font-heading font-bold flex items-center gap-2">
            <Radio className="w-4 h-4" />
            Meta WhatsApp Cloud API setup
          </h3>
          <p>
            The backend sends text messages through Meta's Graph API, requires a signed-in Firebase admin, and verifies webhook signatures and the setup handshake. Valid webhook events are acknowledged but not yet used for auto-replies or delivery tracking.
          </p>
          <div>
            <strong>Callback URL:</strong>{' '}
            <code className="break-all">
              {webhookCallbackUrl.startsWith('https://')
                ? webhookCallbackUrl
                : 'Set the GitHub Pages VITE_API_BASE_URL variable to your Cloudflare Worker URL first.'}
            </code>
          </div>
          <p>
            In Meta Developers, create/select a Business app, add WhatsApp, and set this callback URL. Save a long random verify token as the Cloudflare Worker secret <code>WHATSAPP_VERIFY_TOKEN</code>, and enter the same value in Meta. Save the app secret from App Settings &gt; Basic as <code>WHATSAPP_APP_SECRET</code>. Subscribe the WhatsApp Business Account to the <code>messages</code> webhook field. Configure the access token and phone number ID as Worker secrets, and add authorized Firebase admin emails to the <code>WHATSAPP_ADMIN_EMAILS</code> Worker variable.
          </p>
        </div>
      )}
    </div>
  );
};
