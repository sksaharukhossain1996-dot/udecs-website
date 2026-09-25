import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  connectGmailWithPopup,
  getCachedGmailToken,
  clearGmailToken,
  getGmailProfile,
  listGmailMessages,
  getGmailMessageDetail,
  sendGmailEmail,
  trashGmailEmail,
  GmailProfile,
  GmailMessageSummary,
  GmailMessageDetail,
} from '../../services/gmailService';
import {
  Mail,
  Send,
  RefreshCw,
  Search,
  Trash2,
  Reply,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  User,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Inbox,
  Sparkles,
  X,
} from 'lucide-react';

export const AdminGmailHub: React.FC = () => {
  const { company, addAuditLog, sendNotification, currentUser } = useStore();

  const [profile, setProfile] = useState<GmailProfile | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(Boolean(getCachedGmailToken()));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Compose State
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composeTo, setComposeTo] = useState<string>('');
  const [composeSubject, setComposeSubject] = useState<string>('');
  const [composeBody, setComposeBody] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Mandatory Confirmation Dialog States
  const [confirmSendOpen, setConfirmSendOpen] = useState<boolean>(false);
  const [confirmTrashOpen, setConfirmTrashOpen] = useState<boolean>(false);
  const [messageToTrash, setMessageToTrash] = useState<GmailMessageSummary | GmailMessageDetail | null>(null);

  // Initialize or check connection
  useEffect(() => {
    if (getCachedGmailToken()) {
      setIsConnected(true);
      loadGmailData();
    }
  }, []);

  const handleConnectGmail = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await connectGmailWithPopup();
      setIsConnected(true);
      await loadGmailData();
      addAuditLog({
        action: 'GMAIL_WORKSPACE_CONNECTED',
        module: 'WORKSPACE',
        details: 'Connected to Gmail OAuth Workspace API',
      });
    } catch (err: any) {
      console.error('Failed to connect Gmail:', err);
      setErrorMessage(err?.message || 'Failed to authenticate with Gmail.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    clearGmailToken();
    setIsConnected(false);
    setProfile(null);
    setMessages([]);
    setSelectedMessage(null);
    addAuditLog({
      action: 'GMAIL_WORKSPACE_DISCONNECTED',
      module: 'WORKSPACE',
      details: 'Disconnected Gmail session',
    });
  };

  const loadGmailData = async (queryFilter?: string) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      // 1. Profile
      try {
        const prof = await getGmailProfile();
        setProfile(prof);
      } catch (profErr) {
        console.warn('Profile fetch note:', profErr);
      }

      // 2. Query formulation
      let finalQuery = searchQuery;
      const filter = queryFilter !== undefined ? queryFilter : activeFilter;
      if (filter === 'unread') {
        finalQuery = finalQuery ? `${finalQuery} is:unread` : 'is:unread';
      } else if (filter === 'inquiries') {
        finalQuery = finalQuery ? `${finalQuery} (inquiry OR wholesale OR quote)` : 'inquiry OR wholesale OR quote';
      } else if (filter === 'orders') {
        finalQuery = finalQuery ? `${finalQuery} (order OR dispatch OR awb)` : 'order OR dispatch OR awb';
      } else if (filter === 'sent') {
        finalQuery = finalQuery ? `${finalQuery} in:sent` : 'in:sent';
      }

      const res = await listGmailMessages(finalQuery, 15);
      setMessages(res.messages);
      if (res.messages.length > 0 && !selectedMessage) {
        loadMessageDetail(res.messages[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching Gmail messages:', err);
      setErrorMessage(err?.message || 'Error loading Gmail messages.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessageDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const detail = await getGmailMessageDetail(id);
      setSelectedMessage(detail);
    } catch (err: any) {
      console.error('Error fetching message details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    loadGmailData(filter);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadGmailData();
  };

  // Compose templates
  const applyTemplate = (type: 'dispatch' | 'wholesale' | 'invoice') => {
    if (type === 'dispatch') {
      setComposeSubject(`[UDECS] Order Dispatched: Tracking & Delivery Details`);
      setComposeBody(
        `Dear Customer,\n\nWe are pleased to inform you that your order from UDECS (Unick Digital E-Commerce Solutions) has been processed and handed over to our courier partner.\n\n` +
        `Courier Partner: Delhivery Express\n` +
        `Air Waybill (AWB): DLHV-${Math.floor(10000000 + Math.random() * 90000000)}\n` +
        `Estimated Delivery: 2-3 Business Days\n\n` +
        `Track your consignment directly or reply to this email for assistance.\n\n` +
        `Warm regards,\n` +
        `UDECS Order Fulfillment Team\n` +
        `Pratappur, Panskura, West Bengal 721152\n` +
        `Phone: ${company.whatsapp}`
      );
    } else if (type === 'wholesale') {
      setComposeSubject(`[UDECS] B2B Wholesale Quotation & Catalog Information`);
      setComposeBody(
        `Dear Business Partner,\n\nThank you for reaching out regarding wholesale bulk procurement of UDECS kitchenware and household essentials.\n\n` +
        `Business Details:\n` +
        `• Seller: ${company.legalName}\n` +
        `• GSTIN: ${company.gstin} (West Bengal)\n` +
        `• Payment Terms: Advance / Verified Net 15 for registered retailers\n` +
        `• Delivery: Doorstep logistics across all districts of West Bengal & PAN-India\n\n` +
        `Attached / Included below are the bulk rate slabs for 50+, 200+, and 500+ unit orders.\n\n` +
        `Please let us know your required quantities so we can issue a formal Proforma Invoice.\n\n` +
        `Sincerely,\n` +
        `SK Saharuk Hossain\n` +
        `Founder, UDECS (udecs.in)\n` +
        `Contact: +91-7319190514`
      );
    } else if (type === 'invoice') {
      setComposeSubject(`[UDECS] Tax Invoice & GST Receipt: Order Confirmation`);
      setComposeBody(
        `Dear Valued Customer,\n\n` +
        `Thank you for shopping with UDECS. Your Tax Invoice for your recent purchase is ready.\n\n` +
        `Invoice Summary:\n` +
        `• Supplier: UDECS (GSTIN: ${company.gstin})\n` +
        `• Registered Address: ${company.address}\n` +
        `• Status: Paid in Full\n\n` +
        `A copy has been recorded in our GST compliance filings (GSTR-1). Please retain this email for warranty and record-keeping purposes.\n\n` +
        `Warm regards,\n` +
        `Accounts & Billing Department\n` +
        `UDECS — Unick Digital E-Commerce Solutions`
      );
    }
  };

  // Step 1 of Sending: Open Confirmation Dialog
  const requestSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      alert('Please fill in recipient email, subject, and message body.');
      return;
    }
    setConfirmSendOpen(true);
  };

  // Step 2 of Sending: Execute after user explicit confirmation in dialog
  const executeSendEmail = async () => {
    setConfirmSendOpen(false);
    setIsSending(true);
    try {
      const result = await sendGmailEmail({
        to: composeTo.trim(),
        subject: composeSubject.trim(),
        bodyText: composeBody.trim(),
        fromName: `${company.name} Support`,
      });

      addAuditLog({
        action: 'GMAIL_SENT',
        module: 'WORKSPACE',
        details: `Sent email via Gmail to ${composeTo} with subject "${composeSubject}" (Message ID: ${result.id})`,
      });

      sendNotification(
        'email',
        composeTo,
        composeSubject,
        `Email delivered via Gmail API by staff ${currentUser.name}`
      );

      setIsComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      alert('Email sent successfully via Gmail!');
      loadGmailData();
    } catch (err: any) {
      console.error('Failed to send email via Gmail:', err);
      alert(`Failed to send email: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  // Step 1 of Trashing: Open Confirmation Dialog
  const requestTrashEmail = (msg: GmailMessageSummary | GmailMessageDetail) => {
    setMessageToTrash(msg);
    setConfirmTrashOpen(true);
  };

  // Step 2 of Trashing: Execute after user explicit confirmation in dialog
  const executeTrashEmail = async () => {
    if (!messageToTrash) return;
    setConfirmTrashOpen(false);
    try {
      await trashGmailEmail(messageToTrash.id);
      addAuditLog({
        action: 'GMAIL_TRASHED',
        module: 'WORKSPACE',
        details: `Moved email "${messageToTrash.subject}" to Gmail Trash`,
      });
      setMessages((prev) => prev.filter((m) => m.id !== messageToTrash.id));
      if (selectedMessage?.id === messageToTrash.id) {
        setSelectedMessage(null);
      }
      setMessageToTrash(null);
    } catch (err: any) {
      console.error('Failed to trash email:', err);
      alert(`Failed to delete email: ${err?.message || 'Unknown error'}`);
    }
  };

  const openReply = (msg: GmailMessageDetail) => {
    let replyTo = msg.from;
    const match = msg.from.match(/<([^>]+)>/);
    if (match) {
      replyTo = match[1];
    }
    setComposeTo(replyTo);
    setComposeSubject(msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`);
    setComposeBody(`\n\n--- On ${msg.date}, ${msg.from} wrote ---\n> ${msg.bodyText.slice(0, 300).replace(/\n/g, '\n> ')}...`);
    setIsComposeOpen(true);
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#CBCFB9]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-red-100 text-red-700 rounded-lg">
              <Mail className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0F1913]">
              Gmail Workspace &amp; Client Communications Hub
            </h1>
          </div>
          <p className="text-xs text-[#565F52] mt-1">
            Real Google Workspace Gmail API integration for official dispatch notifications, B2B wholesale quotation replies, and customer support.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <button
                onClick={() => {
                  setComposeTo('');
                  setComposeSubject('');
                  setComposeBody('');
                  setIsComposeOpen(true);
                }}
                className="bg-[#182620] hover:bg-[#0F1913] text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2 transition-all active:scale-[0.98] shadow-sm"
              >
                <Send className="w-3.5 h-3.5 text-[#CC9A2E]" />
                <span>Compose Email</span>
              </button>

              <button
                onClick={() => loadGmailData()}
                disabled={isLoading}
                className="bg-white hover:bg-slate-50 border border-[#CBCFB9] text-[#0F1913] px-3 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Refresh Messages"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleDisconnect}
                className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={handleConnectGmail}
              disabled={isLoading}
              className="bg-white hover:bg-slate-50 text-[#0F1913] border border-[#CBCFB9] px-4 py-2 rounded font-bold text-xs flex items-center gap-2.5 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isLoading ? 'Connecting...' : 'Connect Gmail Account'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Connection Notice / Banner */}
      {!isConnected ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <span>Connect Official UDECS Gmail Account ({company.emailGmail})</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Enabling Gmail allows the UDECS Business Suite to read client inquiries, check wholesale order correspondence, send courier dispatch notices with Delhivery tracking, and distribute GST tax invoices directly to buyers.
            </p>
            <div className="flex items-center gap-4 pt-2 text-[11px] text-amber-900 font-mono">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                OAuth 2.0 Client-Side Token
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Mandatory User Confirmation for Sends
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                In-Memory Caching
              </span>
            </div>
          </div>

          <button
            onClick={handleConnectGmail}
            disabled={isLoading}
            className="w-full md:w-auto bg-[#0F1913] hover:bg-[#182620] text-white px-6 py-3.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-md shrink-0"
          >
            <Mail className="w-4 h-4 text-[#CC9A2E]" />
            <span>{isLoading ? 'Authorizing with Google...' : 'Authorize Gmail Workspace Access'}</span>
          </button>
        </div>
      ) : (
        /* Connected Status Bar */
        <div className="bg-white border border-[#CBCFB9] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[#565F52]">Active Mailbox:</span>
            <span className="font-bold font-mono text-[#0F1913] bg-[#FBFAF5] px-2 py-0.5 rounded border border-[#CBCFB9]">
              {profile?.emailAddress || company.emailGmail}
            </span>
          </div>

          {profile && (
            <div className="flex items-center gap-4 text-[#565F52] text-[11px] font-mono">
              <span>Total Messages: <strong className="text-[#0F1913]">{profile.messagesTotal.toLocaleString()}</strong></span>
              <span>Threads: <strong className="text-[#0F1913]">{profile.threadsTotal.toLocaleString()}</strong></span>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isConnected && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Search, Filter & Message List */}
          <div className="lg:col-span-5 space-y-4">
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-[#565F52] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search messages (e.g. from:customer, order #, wholesale)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-white border border-[#CBCFB9] rounded pl-9 pr-3 py-2 text-[#0F1913] focus:outline-none focus:border-[#A87C1F]"
              />
            </form>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: 'All' },
                { id: 'unread', label: 'Unread' },
                { id: 'inquiries', label: 'Inquiries' },
                { id: 'orders', label: 'Orders' },
                { id: 'sent', label: 'Sent' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFilterChange(f.id)}
                  className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeFilter === f.id
                      ? 'bg-[#0F1913] text-white'
                      : 'bg-white hover:bg-slate-100 text-[#565F52] border border-[#CBCFB9]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Message List */}
            <div className="bg-white border border-[#CBCFB9] rounded-lg divide-y divide-[#CBCFB9] overflow-hidden min-h-[420px] max-h-[640px] overflow-y-auto">
              {isLoading && messages.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#565F52] space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#A87C1F]" />
                  <p>Syncing Gmail mailbox messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#565F52] space-y-2">
                  <Inbox className="w-8 h-8 mx-auto text-[#B9BFAE]" />
                  <p className="font-semibold">No emails found matching criteria</p>
                  <p className="text-[11px] text-[#8C9385]">Try clearing search or changing the filter</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSelected = selectedMessage?.id === msg.id;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => loadMessageDetail(msg.id)}
                      className={`p-3.5 cursor-pointer transition-colors text-xs ${
                        isSelected
                          ? 'bg-[#F2F4EC] border-l-4 border-[#A87C1F]'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`font-semibold truncate max-w-[200px] ${
                            msg.unread ? 'text-[#0F1913] font-bold' : 'text-[#565F52]'
                          }`}
                        >
                          {msg.from.replace(/<.*?>/, '')}
                        </span>
                        <span className="text-[10px] text-[#8C9385] whitespace-nowrap font-mono">
                          {msg.date.split(',')[0]}
                        </span>
                      </div>

                      <div
                        className={`truncate text-xs ${
                          msg.unread ? 'font-bold text-[#0F1913]' : 'text-[#182620]'
                        }`}
                      >
                        {msg.subject || '(No subject)'}
                      </div>

                      <p className="text-[11px] text-[#565F52] truncate mt-0.5">
                        {msg.snippet}
                      </p>

                      <div className="flex items-center gap-1.5 mt-2">
                        {msg.unread && (
                          <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                            UNREAD
                          </span>
                        )}
                        {msg.labelIds?.includes('SENT') && (
                          <span className="text-[9px] bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded">
                            SENT
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Email Detail Viewer */}
          <div className="lg:col-span-7">
            {loadingDetail ? (
              <div className="bg-white border border-[#CBCFB9] rounded-lg p-12 text-center text-xs text-[#565F52] space-y-3 min-h-[420px] flex flex-col items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-[#A87C1F]" />
                <p>Loading email details...</p>
              </div>
            ) : selectedMessage ? (
              <div className="bg-white border border-[#CBCFB9] rounded-lg flex flex-col h-full min-h-[500px]">
                {/* Detail Header */}
                <div className="p-5 border-b border-[#CBCFB9] space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-base font-bold text-[#0F1913] font-heading leading-snug">
                      {selectedMessage.subject || '(No Subject)'}
                    </h2>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openReply(selectedMessage)}
                        className="bg-slate-100 hover:bg-slate-200 text-[#0F1913] p-1.5 rounded transition-colors text-xs flex items-center gap-1"
                        title="Reply to Customer"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Reply</span>
                      </button>

                      <button
                        onClick={() => requestTrashEmail(selectedMessage)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded transition-colors text-xs flex items-center gap-1"
                        title="Move to Trash"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Trash</span>
                      </button>
                    </div>
                  </div>

                  {/* Sender & Recipient Information */}
                  <div className="bg-[#FBFAF5] p-3 rounded border border-[#CBCFB9] text-xs space-y-1 font-mono">
                    <div className="flex items-center justify-between text-[#565F52]">
                      <div>
                        <strong className="text-[#0F1913]">From:</strong> {selectedMessage.from}
                      </div>
                      <span className="text-[10px] text-[#8C9385]">{selectedMessage.date}</span>
                    </div>
                    {selectedMessage.to && (
                      <div className="text-[#565F52]">
                        <strong className="text-[#0F1913]">To:</strong> {selectedMessage.to}
                      </div>
                    )}
                  </div>
                </div>

                {/* Email Body Content */}
                <div className="p-5 flex-1 overflow-y-auto text-xs text-[#0F1913] leading-relaxed font-sans whitespace-pre-wrap">
                  {selectedMessage.bodyText || selectedMessage.snippet}
                </div>

                {/* Bottom Quick Reply Prompt */}
                <div className="p-3.5 border-t border-[#CBCFB9] bg-[#FBFAF5] flex items-center justify-between">
                  <span className="text-[11px] text-[#565F52]">
                    UDECS Workspace Communications • Authenticated
                  </span>
                  <button
                    onClick={() => openReply(selectedMessage)}
                    className="bg-[#0F1913] hover:bg-[#182620] text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Reply className="w-3.5 h-3.5 text-[#CC9A2E]" />
                    <span>Quick Reply</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#CBCFB9] rounded-lg p-12 text-center text-xs text-[#565F52] min-h-[420px] flex flex-col items-center justify-center space-y-3">
                <Mail className="w-10 h-10 text-[#CBCFB9]" />
                <p className="font-semibold text-sm text-[#0F1913]">Select an email to view full conversation</p>
                <p className="text-[#8C9385] max-w-sm">
                  Click on any incoming customer inquiry, order notification, or quotation message on the left.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* COMPOSE EMAIL MODAL */}
      {/* ========================================================= */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBCFB9] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-[#0F1913] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-[#CC9A2E]" />
                <h3 className="font-bold text-sm">Compose Email via Gmail API</h3>
              </div>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template Selector */}
            <div className="p-3 bg-[#FBFAF5] border-b border-[#CBCFB9] flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-[11px] font-bold text-[#565F52] whitespace-nowrap">
                Quick Template:
              </span>
              <button
                type="button"
                onClick={() => applyTemplate('dispatch')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-[#CBCFB9] rounded text-[11px] font-semibold whitespace-nowrap"
              >
                📦 Order Dispatch &amp; Tracking
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('wholesale')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-[#CBCFB9] rounded text-[11px] font-semibold whitespace-nowrap"
              >
                💼 B2B Wholesale Quotation
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('invoice')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-[#CBCFB9] rounded text-[11px] font-semibold whitespace-nowrap"
              >
                🧾 GST Tax Invoice
              </button>
            </div>

            {/* Compose Form */}
            <form onSubmit={requestSendEmail} className="p-4 space-y-3 flex-1 overflow-y-auto">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#565F52] mb-1">
                  Recipient Email (To) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="customer@example.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2 focus:outline-none focus:border-[#A87C1F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#565F52] mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. [UDECS] Order Dispatched #OD-10293"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2 focus:outline-none focus:border-[#A87C1F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#565F52] mb-1">
                  Message Body *
                </label>
                <textarea
                  rows={9}
                  required
                  placeholder="Type your message here..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2.5 font-sans focus:outline-none focus:border-[#A87C1F] leading-relaxed"
                />
              </div>

              <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Per Google Workspace guidelines, you will be shown an explicit confirmation dialog before this email is dispatched from your official account ({profile?.emailAddress || company.emailGmail}).
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 border border-[#CBCFB9] rounded text-xs font-semibold text-[#565F52] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="bg-[#0F1913] hover:bg-[#182620] text-white px-5 py-2 rounded text-xs font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
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
      {/* MANDATORY USER CONFIRMATION DIALOG: SEND EMAIL */}
      {/* ========================================================= */}
      {confirmSendOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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

            <div className="bg-[#FBFAF5] p-3.5 rounded-lg border border-[#CBCFB9] text-xs space-y-1.5 font-mono">
              <div>
                <span className="text-[#565F52]">Sender:</span>{' '}
                <strong className="text-[#0F1913]">{profile?.emailAddress || company.emailGmail}</strong>
              </div>
              <div>
                <span className="text-[#565F52]">Recipient:</span>{' '}
                <strong className="text-[#0F1913]">{composeTo}</strong>
              </div>
              <div className="truncate">
                <span className="text-[#565F52]">Subject:</span>{' '}
                <strong className="text-[#0F1913]">{composeSubject}</strong>
              </div>
            </div>

            <p className="text-xs text-[#565F52] leading-relaxed">
              Are you sure you want to send this message immediately via Google Workspace Gmail API?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSendOpen(false)}
                className="px-4 py-2 border border-[#CBCFB9] rounded text-xs font-semibold text-[#565F52] hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSendEmail}
                disabled={isSending}
                className="bg-[#0F1913] hover:bg-[#182620] text-white px-5 py-2 rounded text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-[0.98]"
              >
                <Send className="w-3.5 h-3.5 text-[#CC9A2E]" />
                <span>{isSending ? 'Sending via Gmail...' : 'Confirm & Send Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MANDATORY USER CONFIRMATION DIALOG: MOVE TO TRASH */}
      {/* ========================================================= */}
      {confirmTrashOpen && messageToTrash && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-900">
              <div className="p-2 bg-red-100 rounded-lg text-red-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F1913]">Delete / Move Email to Trash?</h3>
                <p className="text-xs text-[#565F52]">Action mutates your Gmail mailbox</p>
              </div>
            </div>

            <div className="bg-[#FBFAF5] p-3 rounded-lg border border-[#CBCFB9] text-xs space-y-1">
              <p className="font-semibold text-[#0F1913] truncate">
                "{messageToTrash.subject || '(No Subject)'}"
              </p>
              <p className="text-[#565F52] text-[11px] truncate">
                From: {messageToTrash.from}
              </p>
            </div>

            <p className="text-xs text-[#565F52] leading-relaxed">
              Are you sure you want to move this email to the Gmail Trash? It can be recovered from your Gmail Trash folder within 30 days.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmTrashOpen(false);
                  setMessageToTrash(null);
                }}
                className="px-4 py-2 border border-[#CBCFB9] rounded text-xs font-semibold text-[#565F52] hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeTrashEmail}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-[0.98]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Move to Trash</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
