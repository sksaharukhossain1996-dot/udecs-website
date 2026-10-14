// Service-specific feedback dispatch contract. No transport or production trigger connected.
export type FeedbackGates={live:boolean;metaEligible:boolean;templateApproved:boolean;ownerTestDelivered:boolean};
export const feedbackDefaults:FeedbackGates={live:false,metaEligible:false,templateApproved:false,ownerTestDelivered:false};
export type FeedbackTrigger={leadId:string;stage:string;transitionId:string;whatsappFeedbackConsent:boolean};
export function feedbackDispatchDecision(event:FeedbackTrigger,gates:FeedbackGates,alreadyRecorded:boolean){
 if(!gates.live)return{ready:false,reason:'Feedback dispatch is OFF'};
 if(!gates.metaEligible||!gates.templateApproved||!gates.ownerTestDelivered)return{ready:false,reason:'Messaging activation gates incomplete'};
 if(event.stage!=='Delivered')return{ready:false,reason:'Not a Delivered transition'};
 if(!event.whatsappFeedbackConsent)return{ready:false,reason:'No post-service WhatsApp feedback permission'};
 if(!event.leadId||!event.transitionId)return{ready:false,reason:'Missing stable transition reference'};
 if(alreadyRecorded)return{ready:false,reason:'Transition already recorded; no duplicate send'};
 return{ready:true,reason:'Eligible for a single reviewed-template feedback request',eventKey:'service-feedback:'+event.leadId+':'+event.transitionId};
}
