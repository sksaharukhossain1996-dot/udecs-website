import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { BrandLogo } from './BrandLogo';
import { MessageCircle, X, Send, Bot, User, Phone, CheckCheck, Sparkles, ExternalLink, Mic } from 'lucide-react';
import { getApiUrl } from '../../services/api';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

interface WhatsAppAIChatProps {
  onOpenVoice?: () => void;
}

export const WhatsAppAIChat: React.FC<WhatsAppAIChatProps> = ({ onOpenVoice }) => {
  const { company, language } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: `Hello! Welcome to UDECS · UNICK DIGITAL COMMERCE SOLUTIONS (udecs.store).\n\nI am your AI Customer Support Assistant. How can I assist you today with cookware, sports equipment, B2B wholesale orders, or order tracking?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/ai-chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const aiReply = data.text || 'Thank you for your message. How else may I assist you today?';

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: aiReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text:
            language === 'bn'
              ? `ধন্যবাদ আপনার বার্তার জন্য। সরাসরি আমাদের সাপোর্ট টিমের সাথে হোয়াটসঅ্যাপে কথা বলতে ক্লিক করুন: ${company.whatsapp} অথবা ইমেইল করুন ${company.emailGmail}।`
              : `Thank you for your inquiry. For immediate human support, please message our WhatsApp hotline directly at ${company.whatsapp} or email ${company.emailGmail}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    language === 'bn' ? 'পাইকারি বি২বি রেট ও ডিসকাউন্ট?' : 'Wholesale B2B pricing?',
    language === 'bn' ? 'জিএসটি বিল ও ইনপুট ট্যাক্স?' : 'GST invoice & tax credit?',
    language === 'bn' ? 'অর্ডার ট্র্যাকিং ও ডেলিভারি সময়?' : 'Track my shipment?',
    language === 'bn' ? 'PayU পেমেন্ট ও ক্যাশ অন ডেলিভারি?' : 'PayU payment options?',
  ];

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col sm:flex-row items-end sm:items-center gap-2.5">
      {/* Floating Toggle Buttons */}
      {!isOpen && (
        <>
          {onOpenVoice && (
            <button
              onClick={onOpenVoice}
              className="bg-[#E8730A] hover:bg-[#D06505] text-white p-3.5 rounded-full shadow-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group border-2 border-white/20"
              aria-label="Live Voice Assistant"
              title="Talk to the Gemini Live voice assistant"
            >
              <Mic className="w-5 h-5 text-amber-200 animate-pulse" />
              <span className="hidden sm:inline font-bold text-xs pr-1 font-heading">
                Voice AI
              </span>
            </button>
          )}

          <button
            onClick={() => setIsOpen(true)}
            className="bg-[#25D366] hover:bg-[#1EBE5D] text-white p-3.5 rounded-full shadow-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group border-2 border-white/20"
            aria-label="Open WhatsApp AI Support"
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5 fill-current" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full"></span>
            </div>
            <span className="hidden sm:inline font-bold text-xs pr-1 font-heading">
              WhatsApp Chat
            </span>
          </button>
        </>
      )}

      {/* WhatsApp Chat Window */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[380px] h-[520px] bg-[#FBFAF5] border border-[#CBCFB9] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-scaleIn">
          {/* Header styled like WhatsApp Business Header */}
          <div className="bg-[#075E54] text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white p-1 flex items-center justify-center border border-white/30 shrink-0">
                <img src="/UDECS_Logo_Premium_Transparent.png" alt="UDECS" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs leading-none">UDECS Assistant</h4>
                  <span className="text-[9px] bg-[#25D366] text-white px-1 py-0.2 rounded font-bold">
                    VERIFIED
                  </span>
                </div>
                <p className="text-[10px] text-white/80 mt-0.5">
                  udecs.store · WhatsApp: +91 9845485437
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onOpenVoice && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenVoice();
                  }}
                  className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  title="Switch to Live Voice Conversation"
                >
                  <Mic className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>Live Call</span>
                </button>
              )}
              <a
                href={`https://wa.me/919845485437?text=Hello%20UNICK%20DIGITAL%2C%20I%20have%20an%20inquiry%20regarding%20udecs.store`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 hover:bg-white/10 rounded text-white"
                title="Open WhatsApp app"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded text-white"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#EFEAE2]">
            {messages.map((msg) => {
              const isAi = msg.sender === 'ai';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-2.5 text-xs shadow-xs leading-relaxed whitespace-pre-wrap ${
                      isAi
                        ? 'bg-white text-[#0F1913] rounded-tl-none border border-black/5'
                        : 'bg-[#DCF8C6] text-[#0F1913] rounded-tr-none'
                    }`}
                  >
                    {isAi && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[#075E54] mb-1">
                        <Sparkles className="w-2.5 h-2.5 text-[#CC9A2E]" />
                        <span>UNICK AI Specialist</span>
                      </div>
                    )}
                    {msg.text}
                    <div className="flex items-center justify-end gap-1 text-[9px] text-gray-500 mt-1">
                      <span>{msg.timestamp}</span>
                      {!isAi && <CheckCheck className="w-3 h-3 text-[#34B7F1]" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 bg-white text-[#565F52] text-xs p-2.5 rounded-lg max-w-[70%] border border-black/5 shadow-xs">
                <div className="w-2 h-2 rounded-full bg-[#075E54] animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-[#075E54] animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 rounded-full bg-[#075E54] animate-bounce [animation-delay:0.4s]"></div>
                <span className="text-[11px] font-medium ml-1">UNICK AI is typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="p-2 bg-[#FBFAF5] border-t border-[#CBCFB9] overflow-x-auto flex gap-1.5 no-scrollbar">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputMessage(q);
                }}
                className="text-[10px] font-medium bg-[#EEF0E7] hover:bg-[#E4E8D9] text-[#0F1913] px-2.5 py-1 rounded-full whitespace-nowrap border border-[#CBCFB9] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-2.5 bg-[#FBFAF5] border-t border-[#CBCFB9] flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={language === 'bn' ? 'বাংলা বা ইংরেজিতে মেসেজ লিখুন...' : 'Type message in Bengali, English, or Hindi...'}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 bg-white border border-[#CBCFB9] rounded-full px-3.5 py-2 text-xs text-[#0F1913] focus:outline-none focus:border-[#075E54]"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="w-8 h-8 rounded-full bg-[#075E54] hover:bg-[#128C7E] disabled:bg-gray-400 text-white flex items-center justify-center transition-colors shrink-0"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Direct WhatsApp Call Footer */}
          <div className="bg-[#182620] text-white px-3 py-1.5 text-[10px] flex items-center justify-between font-mono">
            <span className="flex items-center gap-1">
              <Phone className="w-2.5 h-2.5 text-[#25D366]" />
              Hotline: +91 9845485437
            </span>
            <a
              href="https://wa.me/919845485437"
              target="_blank"
              rel="noreferrer"
              className="text-[#CC9A2E] hover:underline font-bold"
            >
              Open in WhatsApp →
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
