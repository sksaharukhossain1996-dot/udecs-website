import {CUSTOMER_SUPPORT_ENABLED} from '../../customer-stage/featureFlags';
import React, {useState} from 'react';
import { useStore } from '../../context/StoreContext';
import { BrandLogo } from '../common/BrandLogo';
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  FileSpreadsheet,
  Users,
  FileEdit,
  Bell,
  History,
  Settings,
  LogOut,
  UserCheck,
  Shield,
  ArrowLeft,
  Globe,
  Mail,
  MessageSquare,
  TrendingUp,
  Truck, PackagePlus, PackageSearch, RefreshCw, Handshake, ContactRound, CalendarClock, NotebookPen, Bot, Activity, Search, ChevronRight, Menu, X,
} from 'lucide-react';

export type AdminTab =
  | 'erp'
  | 'crm'
  | 'overview'
  | 'website_control'
  | 'whatsapp_automation'
  | 'orders'
  | 'rfq'
  | 'b2b_quotation'
  | 'customers'
  | 'product_listing'
  | 'inventory'
  | 'stock_update'
  | 'gst'
  | 'investors'
  | 'hr'
  | 'collaboration'
  | 'notifications'
  | 'gmail'
  | 'ai_agent_hub'
  | 'software_health'
  | 'audit'
  | 'settings';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onExitAdmin: () => void;
  onCloseMenu?:()=>void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  onExitAdmin,
  onCloseMenu,
}) => {
  const [query,setQuery]=useState(''),[mobileOpen,setMobileOpen]=useState(false),[matches,setMatches]=useState<string[]>([]);
  const {
    currentUser,
    logout,
    company,
    language,
    isFirebaseConnected,
    firebaseUser,
    signOutFirebaseAuth,
  } = useStore();

  const navItems: { id: AdminTab; labelBn: string; labelEn: string; icon: any; roleMin?: string }[] = [
    { id:'erp',labelBn:'ERP - Inventory & Finance',labelEn:'ERP - Inventory & Finance',icon:Boxes,roleMin:'admin'},
    { id: 'crm', labelBn: 'CRM - গ্রাহক সম্পর্ক', labelEn: 'CRM - Customer Relationships', icon: ContactRound },
    { id: 'overview', labelBn: 'ড্যাশবোর্ড ওভারভিউ', labelEn: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'website_control', labelBn: 'ওয়েবসাইট সেটিংস ও কন্ট্রোল', labelEn: 'Website Settings & Control', icon: Globe },
    { id: 'whatsapp_automation', labelBn: 'হোয়াটসঅ্যাপ অটোমেশন 🟢', labelEn: 'WhatsApp Automation Hub', icon: MessageSquare },
    {id:'b2b_quotation',labelBn:'B2B Customer Quotation',labelEn:'B2B Customer Quotation',icon:FileEdit},
    { id: 'rfq', labelBn: 'B2B Wholesale Inquiry', labelEn: 'B2B Wholesale Inquiry', icon: Handshake },
    { id: 'orders', labelBn: 'অর্ডার ও লজিস্টিকস শিপিং', labelEn: 'Orders & Logistics', icon: Truck },
    { id: 'product_listing', labelBn: 'প্রোডাক্ট যোগ / ডিলিট', labelEn: 'Product listing', icon: PackagePlus },
    { id: 'stock_update', labelBn: 'স্টক আপডেট', labelEn: 'Stock Update', icon: RefreshCw },
    { id: 'inventory', labelBn: 'অটোমেটেড ইনভেন্টরি', labelEn: 'Automated Inventory', icon: PackageSearch },
    { id: 'gst', labelBn: 'জিএসটি রিপোর্ট ও ট্যাক্স', labelEn: 'GST Reports & Filing', icon: FileSpreadsheet },
    { id: 'investors', labelBn: 'বিনিয়োগকারী লিড', labelEn: 'Investor Leads', icon: TrendingUp },
    { id: 'hr', labelBn: 'কর্মচারী ও স্যালারি স্লিপ', labelEn: 'HR, Attendance & Payroll', icon: CalendarClock },
    { id: 'collaboration', labelBn: 'টিম কোলাবরেশন নোটস', labelEn: 'Live Collaboration', icon: NotebookPen },
    { id: 'gmail', labelBn: 'Gmail হাব ও গ্রাহক মেল', labelEn: 'Gmail Workspace Hub', icon: Mail },
    { id: 'notifications', labelBn: 'নোটিফিকেশন ও SMS হাব', labelEn: 'Notifications & SMS', icon: Bell },
    {id:'ai_agent_hub',labelBn:'AI-Agent Hub',labelEn:'AI-Agent Hub',icon:Bot,roleMin:'admin'},
    {id:'software_health',labelBn:'Software Health',labelEn:'Software Health',icon:Activity,roleMin:'admin'},
    { id: 'audit', labelBn: 'সিস্টেম অডিট ট্রেইল লগ', labelEn: 'System Audit Trail', icon: History },
    { id: 'settings', labelBn: 'PayU ও সিস্টেম সেটিংস', labelEn: 'PayU & Settings', icon: Settings },
  ];

  if(CUSTOMER_SUPPORT_ENABLED) navItems.push({id:'customers',labelBn:'Customer portal',labelEn:'Customer portal',icon:UserCheck});
  const groups=[{label:'Business',ids:['erp','crm','overview']},{label:'Commerce',ids:['website_control','whatsapp_automation','rfq','b2b_quotation','orders','product_listing','stock_update','inventory']},{label:'Finance & Team',ids:['gst','investors','hr','collaboration']},{label:'Workspace & System',ids:['gmail','notifications','ai_agent_hub','software_health','audit','settings','customers']}];
  const findLoaded=()=>{const q=query.trim().toLowerCase();setMatches(q?Array.from(document.querySelectorAll('#udecs-current-view tr, #udecs-current-view article, .admin-content tr, .admin-content article')).filter((el,i,a)=>a.indexOf(el)===i&&(el.textContent||'').toLowerCase().includes(q)).slice(0,20).map(el=>(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,240)):[]);};
  const select=(tab:AdminTab)=>{setMatches([]);onSelectTab(tab);setMobileOpen(false);};
  return (<>
    <style>{NAV_STYLE}</style>
    {!onCloseMenu&&<button className="workspace-menu-toggle" onClick={()=>setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen}><Menu size={18}/> All tabs</button>}
    {mobileOpen&&<button className="workspace-backdrop" aria-label="Close tabs menu" onClick={()=>setMobileOpen(false)}/>}
    <aside className={`udecs-workspace ${mobileOpen?'workspace-open':''}`}>
      <div className="workspace-brand"><div>
        {(window as any).__UDECS_DESKTOP_ENTRY__?<div className="workspace-logo"><img src="./udecs-menu-owner-logo.jpg" alt="UDECS original 3D logo"/><div><strong>UDECS Management</strong><small>All business tabs</small></div></div>:<BrandLogo size="xs" textColor="text-[#183758]" subtextColor="text-[#e98b22]"/>}
        <p>GSTIN: {company.gstin}</p></div><button className="workspace-close" aria-label="Close all tabs menu" onClick={()=>{setMobileOpen(false);onCloseMenu?.();}}><X size={18}/></button></div>
      {currentUser&&<div className="workspace-owner"><div className="workspace-avatar">{currentUser.name.charAt(0)}</div><div><strong>{currentUser.name}</strong><small><Shield size={11}/> {currentUser.role}</small></div></div>}
      <div className="workspace-search"><label><Search size={17}/><input type="search" aria-label="Search management" placeholder="Search tabs or loaded view..." value={query} onChange={e=>{setQuery(e.target.value);setMatches([]);}}/></label>{query.trim()&&<><button className="workspace-find" onClick={findLoaded}>Find in loaded view</button><small>Only loaded rows/cards. Other pages and attachments are not searched.</small></>}{matches.length>0&&<div className="workspace-results" role="status">{matches.length} matches (up to 20){matches.map((t,i)=><p key={i}>{t}</p>)}</div>}</div>
      <nav aria-label="Business sections">{groups.map(group=>{const items=navItems.filter(item=>group.ids.includes(item.id)&&(!query.trim()||item.labelEn.toLowerCase().includes(query.trim().toLowerCase())||item.labelBn.includes(query.trim())));return items.length>0&&<section key={group.label}><h2>{group.label}</h2>{items.map(item=>{const Icon=item.icon;return <button key={item.id} onClick={()=>select(item.id)} aria-current={currentTab===item.id?'page':undefined}><span className="workspace-icon"><Icon size={19} strokeWidth={1.8}/></span><span>{language==='bn'?item.labelBn:item.labelEn}</span><ChevronRight size={13} className="workspace-chevron"/></button>;})}</section>;})}{query.trim()&&!navItems.some(item=>item.labelEn.toLowerCase().includes(query.trim().toLowerCase())||item.labelBn.includes(query.trim()))&&<p className="workspace-empty">No matching tab. You can search text in the loaded view.</p>}</nav>
      <div className="workspace-footer"><button onClick={onExitAdmin}><ArrowLeft size={15}/>{language==='bn'?'স্টোরে ফিরে যান':'Back to Storefront'}</button><button onClick={()=>{if(firebaseUser)signOutFirebaseAuth();else logout();}}><LogOut size={15}/>{language==='bn'?'লগআউট':'Sign Out'}</button></div>
    </aside>
  </>);
};
const NAV_STYLE=`
.premium-admin aside.udecs-workspace{width:300px!important;max-height:none!important;background:#f5f8fc!important;color:#183758!important;display:flex;flex-direction:column;border-right:1px solid #dce5ef;flex-shrink:0;font-family:Arial,sans-serif;overflow:hidden}
.udecs-workspace .workspace-brand{display:flex!important;padding:17px 16px 10px;align-items:flex-start;gap:5px}.workspace-brand>div{display:block!important;flex:1;min-width:0}.workspace-brand p{font-size:9px;margin:6px 0;color:#73869d!important}.workspace-logo{display:flex;gap:10px;align-items:center}.workspace-logo img{width:52px;height:52px;border-radius:12px}.workspace-logo strong{font-size:17px}.workspace-logo small{display:block;margin-top:5px;font-size:11px;color:#71879d}.workspace-close{border:0;background:none;color:#47617d;min-width:30px}.workspace-owner{display:flex!important;align-items:center;gap:10px;background:white;padding:12px;margin:0 13px;border-radius:12px}.workspace-avatar{width:34px;height:34px;border-radius:50%;background:#284c62;color:white;display:grid;place-items:center;flex-shrink:0}.workspace-owner strong{display:block;font-size:11px;overflow-wrap:anywhere}.workspace-owner small{display:flex;gap:4px;align-items:center;font-size:10px;margin-top:5px;color:#71849b;text-transform:uppercase}.workspace-search{padding:13px;display:block!important}.workspace-search label{display:flex;gap:8px;align-items:center;border:1px solid #d4dfed;background:white;padding:0 10px;border-radius:10px}.workspace-search input{width:100%;min-width:0;border:0!important;background:transparent;font-size:12px;outline:none;color:#183758;min-height:40px!important}.workspace-search small{display:block;font-size:10px;line-height:1.5;color:#71849b;margin-top:5px}.workspace-find{border:1px solid #d4dfed;background:white;color:#183758;border-radius:8px;padding:6px;font-size:11px;margin-top:6px}.workspace-results{max-height:160px;overflow:auto;font-size:11px}.workspace-results p{padding:8px;background:white;border-radius:8px}.premium-admin .udecs-workspace nav{display:block!important;overflow-y:auto!important;overflow-x:hidden;flex:1;min-height:0;max-height:none!important;padding:0 13px 14px!important}.udecs-workspace nav section{background:white;border:1px solid #dce5ef;border-radius:13px;margin-bottom:12px;padding:5px}.udecs-workspace nav h2{font-size:10px!important;letter-spacing:1px;color:#7a8ba0!important;text-transform:uppercase;margin:10px 9px}.premium-admin .udecs-workspace nav button{display:flex;align-items:center;width:100%!important;gap:10px;border:0!important;background:transparent;color:#193959!important;border-radius:9px;font-size:12px;min-height:44px;white-space:normal;text-align:left;padding:7px;box-shadow:none}.udecs-workspace nav button>span:nth-child(2){flex:1}.workspace-icon{width:29px;height:29px;border-radius:8px;background:#edf3f9;display:grid;place-items:center;flex-shrink:0}.premium-admin .udecs-workspace nav button svg{color:#456887!important}.workspace-chevron{opacity:.5}.premium-admin .udecs-workspace nav button[aria-current=page]{background:#e7f0f7!important;border-left:3px solid #f59625!important}.premium-admin .udecs-workspace nav button[aria-current=page] .workspace-icon{background:#294e6f}.premium-admin .udecs-workspace nav button[aria-current=page] .workspace-icon svg{color:#ffa638!important}.workspace-empty{font-size:12px;line-height:1.6;padding:10px}.udecs-workspace .workspace-footer{display:flex!important;gap:6px;padding:12px;border-top:1px solid #dce5ef;background:#f5f8fc}.workspace-footer button{display:flex!important;align-items:center;justify-content:center;gap:5px;background:white;border:1px solid #d4dfed;border-radius:9px;color:#244663;padding:8px;font-size:10px;flex:1}.workspace-footer button:last-child{color:#a24a53}.workspace-menu-toggle,.workspace-backdrop{display:none}.workspace-menu-toggle{align-items:center;gap:8px;padding:9px 12px;border:0;border-bottom:1px solid #dce5ef;background:#f5f8fc;color:#183758;flex-shrink:0;text-align:left}.phone-management.phone-menu-open aside.udecs-workspace{width:min(92vw,350px)!important;background:#f5f8fc!important;box-shadow:16px 0 45px #030c1855}.phone-management.phone-menu-open aside.udecs-workspace .workspace-brand,.phone-management.phone-menu-open aside.udecs-workspace .workspace-owner,.phone-management.phone-menu-open aside.udecs-workspace .workspace-search{display:flex!important}.phone-management.phone-menu-open aside.udecs-workspace .workspace-search{display:block!important}.phone-management.phone-menu-open aside.udecs-workspace nav{display:block!important}.phone-management.phone-menu-open aside.udecs-workspace .workspace-footer{display:flex!important}
@media(min-width:761px){.workspace-close{display:none}}@media(max-width:760px){.workspace-menu-toggle{display:flex}.premium-admin:not(.phone-management) aside.udecs-workspace{display:none!important}.premium-admin:not(.phone-management) aside.udecs-workspace.workspace-open{display:flex!important;position:absolute;top:0;bottom:0;left:0;width:min(92vw,350px)!important;z-index:95}.workspace-backdrop{display:block;position:absolute;inset:0;background:#07111bbb;border:0;z-index:90}}
/* Approved Commerce Navy and compact phone header. */
.phone-management.phone-menu-open aside.udecs-workspace .workspace-brand{flex:none!important;min-height:0!important;display:flex!important;flex-direction:row!important;justify-content:space-between!important;align-items:flex-start!important;padding:20px 16px 12px!important}
.phone-management.phone-menu-open aside.udecs-workspace .workspace-brand>div{display:block!important;flex:1!important}
.phone-management.phone-menu-open aside.udecs-workspace .workspace-logo{display:flex!important;flex-direction:row!important;align-items:center!important;gap:10px!important}
.phone-management.phone-menu-open aside.udecs-workspace .workspace-logo>div{display:block!important}
.phone-management.phone-menu-open aside.udecs-workspace .workspace-logo strong{font-size:17px!important;line-height:1.25!important;display:block!important}
.phone-management.phone-menu-open aside.udecs-workspace .workspace-logo img{width:52px!important;height:52px!important}
.phone-management.phone-menu-open aside.udecs-workspace .workspace-brand p{display:block!important;font-size:9px!important;margin:6px 0 0!important}
.phone-management.phone-menu-open aside.udecs-workspace .workspace-owner,.phone-management.phone-menu-open aside.udecs-workspace .workspace-search,.phone-management.phone-menu-open aside.udecs-workspace .workspace-footer{flex:none!important}
.phone-management.phone-menu-open aside.udecs-workspace .workspace-close{flex:none!important;margin-top:0!important}
.premium-admin aside.udecs-workspace{position:relative;isolation:isolate}
.udecs-workspace:before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background-image:url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTYiIGhlaWdodD0iMTU2IiB2aWV3Qm94PSIwIDAgMTU2IDE1NiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYjVjZWU4IiBzdHJva2Utd2lkdGg9IjEuNSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTUgMTgpIHJvdGF0ZSgtMTIpIj48cGF0aCBkPSJNMCAwaDVsNCAxOWgxOWw1LTE0SDdNMTIgMjRoMW0xMiAwaDEiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjI0IiByPSIyIi8+PGNpcmNsZSBjeD0iMjUiIGN5PSIyNCIgcj0iMiIvPjwvZz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg5MCA3MCkgcm90YXRlKDEwKSI+PHBhdGggZD0iTTAgNWwxNS03IDE1IDd2MjFsLTE1IDgtMTUtOFpNMCA1bDE1IDggMTUtOE0xNSAxM3YyMU03IDFsMTYgOCIvPjwvZz48cGF0aCBkPSJNMzAgMTEyaDI1djIxSDMwem0wIDhoMjVtLTE2LTh2MjFNMTA5IDE3aDIwdjIwaC0yMG0wLTIwIDIwIDIwIi8+PC9zdmc+Cg==');background-size:156px;opacity:.12}
.premium-admin .udecs-workspace nav section{background:#ffffffed!important;box-shadow:0 4px 16px #0513260c}
.premium-admin aside.udecs-workspace,.phone-management.phone-menu-open aside.udecs-workspace{background:linear-gradient(150deg,#25486f,#0e263f 65%,#1b3d5d)!important;color:#eef5ff!important}
.premium-admin .udecs-workspace:before{opacity:.13}
.premium-admin .workspace-brand p,.premium-admin .workspace-logo small{color:#bed0e4!important}
.premium-admin .workspace-close{color:#e6f0fc!important}
.premium-admin .workspace-footer{background:#122f4b!important;border-color:#577089!important}
.phone-management.phone-menu-open aside.udecs-workspace{height:100vh!important;display:flex!important;flex-direction:column!important;justify-content:flex-start!important}
.phone-management.phone-menu-open aside.udecs-workspace nav{flex:1 1 0!important;min-height:0!important;height:0!important;max-height:none!important;overflow-y:auto!important}
.phone-management.phone-menu-open aside.udecs-workspace .workspace-footer{display:flex!important;flex:0 0 auto!important;min-height:58px!important;position:relative!important;padding:12px!important}
.phone-management.phone-menu-open aside.udecs-workspace .workspace-footer button{display:flex!important}
.premium-admin .workspace-owner strong{color:#193959!important}
.premium-admin aside.udecs-workspace nav button[aria-current=page]{background:#e7f0f7!important;color:#193959!important}
`;
