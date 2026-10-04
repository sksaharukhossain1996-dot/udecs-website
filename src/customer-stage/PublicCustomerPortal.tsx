import React,{useState,useEffect}from'react';
import{CustomerIntake}from'./CustomerIntake';
import{watchCustomerIdentity}from'./customerIdentity';
import'./customer-stage.css';
import{MyOrders}from'./MyOrders';
import{customerOrderClient,ORDER_SERVICE_ORIGIN}from'./orderRuntime';
import{BrandLogo}from'../components/common/BrandLogo';

export function PublicCustomerPortal(){
  const[saved,setSaved]=useState(false);
  const[reviewExisting,setReviewExisting]=useState(false);
  const[uid,setUid]=useState<string|null>(null);
  useEffect(()=>watchCustomerIdentity(u=>{setSaved(false);setReviewExisting(false);setUid(u?.uid||null)}),[]);
  return(
    <div className="visual-store udecs-customer-portal min-h-screen bg-[#EEF0E7] text-[#0F1913] font-sans flex flex-col">
      <header className="sticky top-0 z-40 bg-[#EEF0E7]/95 backdrop-blur-md border-b border-[#CBCFB9]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <a href="/" aria-label="UDECS store home" className="flex items-center">
            <BrandLogo size="sm"/>
          </a>
          <a href="/" className="text-xs font-semibold text-[#3C6656] hover:text-[#0F1913] transition-colors">
            &larr; Back to store
          </a>
        </div>
      </header>
      <main className="flex-1 w-full max-w-xl mx-auto p-4">
        <h1 className="text-2xl font-bold mt-2">UDECS Customer portal</h1>
        <p className="text-sm text-[#565F52] mt-1 mb-2">Sign in, save your delivery details and see your orders.</p>
        {saved?<section className="customer-stage"><h2>Your customer details are saved</h2><p>You are signed in with your verified email. Your phone number is not verified.</p><a href="/">Back to UDECS store</a><button onClick={()=>{setReviewExisting(true);setSaved(false)}}>Review my details</button></section>:<CustomerIntake enabled reviewExisting={reviewExisting} onSaved={()=>{setReviewExisting(false);setSaved(true)}}/>}
        {ORDER_SERVICE_ORIGIN&&<MyOrders uid={uid} load={cursor=>customerOrderClient().mine(cursor)}/>}
      </main>
      <footer className="w-full max-w-xl mx-auto p-4 text-center">
        <a href="/" className="text-xs font-semibold text-white hover:underline">&larr; Back to udecs.store</a>
      </footer>
    </div>
  );
}
