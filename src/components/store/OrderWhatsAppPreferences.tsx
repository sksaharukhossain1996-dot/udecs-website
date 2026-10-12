import React from 'react';
export function OrderWhatsAppPreferences({language,accepted,disabled,onLanguageChange,onAcceptedChange}:{language:'en'|'hi-roman';accepted:boolean;disabled:boolean;onLanguageChange:(v:'en'|'hi-roman')=>void;onAcceptedChange:(v:boolean)=>void}){return (<fieldset className="rounded border border-[#CBCFB9] bg-white p-3 space-y-3" disabled={disabled}>
                  <legend className="text-sm font-bold px-1">WhatsApp order updates (optional)</legend>
                  <p className="text-xs font-semibold">Messages are sent in English.</p>
                  <label className="flex gap-2 items-start text-xs leading-relaxed"><input type="checkbox" checked={accepted} onChange={e=>onAcceptedChange(e.target.checked)} className="mt-1"/><span>I agree to receive WhatsApp order, shipping and delivery updates from UDECS at this number. I can opt out by replying STOP. Optional; I can order without selecting this.</span></label>
                  <p className="text-xs text-[#3C6656]">Order updates only, no promotional messages.</p>
                  {disabled&&<p className="text-xs">Recovering the same order reference preserves its original choices.</p>}
                </fieldset>);}
