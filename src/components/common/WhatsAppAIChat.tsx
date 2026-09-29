import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

// The AI endpoint and WhatsApp Business API are not live yet. Route customers to
// the existing business WhatsApp account without implying automated or verified service.
export const WhatsAppAIChat: React.FC<{ onOpenVoice?: () => void }> = () => {
  const { company } = useStore();
  const phone = (company.whatsapp || '').replace(/\D/g, '');
  const whatsappUrl = phone ? `https://wa.me/${phone}` : 'https://wa.me/919845485437';
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with UDECS on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-xs font-bold text-white shadow-xl hover:bg-[#1EBE5D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075E54]"
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      Chat on WhatsApp
    </a>
  );
};
