import{test}from'node:test';import a from'node:assert/strict';import * as XLSX from'xlsx';import{sheetRows,mapRow}from'../src/quotation/import';
function book(rows:any[][]){const b=XLSX.utils.book_new();XLSX.utils.book_append_sheet(b,XLSX.utils.aoa_to_sheet(rows),'Customers');return b}
test('XLS and XLSX parse customer strings',()=>{for(const type of['xls','xlsx']as const){const b=book([['business','phone'],['Sample','012345']]);const data=XLSX.write(b,{type:'array',bookType:type});const read=XLSX.read(data,{type:'array'});const rows=sheetRows(read,'Customers');a.equal(mapRow(rows[1],{business:'0',phone:'1'}).phone,'012345')}});
test('formulas rejected',()=>{const b=book([['business'],['Sample']]);b.Sheets.Customers.A2={t:'s',f:'HYPERLINK("https://example.invalid","test")',v:'test'};a.throws(()=>sheetRows(b,'Customers'))});
test('mapping and long fields validated',()=>{a.throws(()=>mapRow([''],{business:'0'}));a.throws(()=>mapRow(['x'.repeat(1001)],{business:'0'}));a.equal(mapRow(['Sample'],{business:'0',phone:''}).phone,'')});
test('column bound',()=>{a.throws(()=>sheetRows(book([Array(51).fill('a')]),'Customers'))});
test('row bound',()=>{a.throws(()=>sheetRows(book(Array(202).fill(['a'])),'Customers'))});
