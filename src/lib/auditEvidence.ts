// Exact bundled examples only. Preserve original records; hide examples from business summaries.
export function isBundledAuditExample(log:{id:string;action:string;details:string}):boolean {
 return [
 ['LOG-101','INVENTORY_SYNC','Automated stock reconciliation completed for 12 items. 2 items flagged below reorder threshold.'],
 ['LOG-102','ORDER_DISPATCH','Order UDECS-ORD-9844 handed over to Blue Dart (AWB: BD77881923).'],
 ['LOG-103','GST_INVOICE_GENERATED','Generated B2B Tax Invoice for Order UDECS-ORD-9842 with GSTIN 19AAECF1234K1Z5.']
 ].some(([id,action,details])=>log.id===id&&log.action===action&&log.details===details);
}
