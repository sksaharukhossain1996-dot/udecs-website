export const wholesaleMinimumQty = (product: {supplier?:string; minimumOrderQty?:number; quantityStep?:number}) => {
 const step = Math.max(1, product.quantityStep || 1);
 const minimum = Math.max(product.minimumOrderQty || 1, product.supplier === 'rajkot' ? 100 : 1);
 return Math.ceil(minimum / step) * step;
};
export const normalizeWholesaleQty = (product: {supplier?:string; minimumOrderQty?:number; quantityStep?:number}, quantity:number) => Math.max(wholesaleMinimumQty(product), Math.ceil(quantity/(product.quantityStep || 1))*(product.quantityStep || 1));
export const wholesaleAvailability = (product: {stockManaged?:boolean;supplierInStock?:boolean;stock:number}) => product.stockManaged === false ? product.supplierInStock === true : product.stock > 0;
export const quoteTotals = (items:{price:number;qty:number;rate:number}[]) => {
 const money=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
 const net=money(items.reduce((n,p)=>n+p.price*p.qty,0));
 const tax=money(items.reduce((n,p)=>n+money(p.price*p.qty*p.rate/100),0));
 return {net,tax,total:money(net+tax)};
};

// Presentation only: retain supplier/catalog data for inventory and sourcing.
export const customerProductText = (product: {supplier?:string}, text?:string) =>
 product.supplier === 'rajkot' ? (text || '').replace(/ali\s*rajkot|rajkot/gi, 'UDECS') : (text || '');
export const customerProductTitle = (product: {supplier?:string;name:string;nameBn?:string}, language='en') =>
 customerProductText(product, language === 'bn' ? product.nameBn || product.name : product.name);
