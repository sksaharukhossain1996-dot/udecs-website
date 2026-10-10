export type Identified = {id:string};
export async function collectServerPages<T extends Identified>(readPage:(after:string|undefined,size:number)=>Promise<T[]>,checkAccount:()=>void,pageSize=500,maxRecords=10000):Promise<T[]> {
  if(!Number.isInteger(pageSize)||pageSize<1||!Number.isInteger(maxRecords)||maxRecords<pageSize)throw Error('Invalid source paging bounds.');
  const rows:T[]=[],seen=new Set<string>();let after:string|undefined;
  for(;;){
    checkAccount();
    const page=await readPage(after,Math.min(pageSize,maxRecords-rows.length+1));
    checkAccount();
    if(page.length>pageSize)throw Error('Unexpected server page size. No partial summary.');
    for(const row of page){
      if(!row.id||seen.has(row.id)||(after!==undefined&&row.id<=after))throw Error('Source paging changed or repeated. Refresh; no partial summary.');
      seen.add(row.id);rows.push(row);after=row.id;
      if(rows.length>maxRecords)throw Error('Source exceeds '+maxRecords+' records. Narrow the source before summary; no partial result.');
    }
    if(page.length<pageSize)return rows;
  }
}
