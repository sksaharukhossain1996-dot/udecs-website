export const normalizeWholesaleQty = (product: {minimumOrderQty?:number; quantityStep?:number}, quantity:number) => Math.max(product.minimumOrderQty || 1, Math.ceil(quantity/(product.quantityStep || 1))*(product.quantityStep || 1));
export const wholesaleAvailability = (product: {stockManaged?:boolean;supplierInStock?:boolean;stock:number}) => product.stockManaged === false ? product.supplierInStock === true : product.stock > 0;
export const quoteTotals = (items:{price:number;qty:number;rate:number}[]) => {
 const money=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
 const net=money(items.reduce((n,p)=>n+p.price*p.qty,0));
 const tax=money(items.reduce((n,p)=>n+money(p.price*p.qty*p.rate/100),0));
 return {net,tax,total:money(net+tax)};
};
