const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies'),documents=require('../miniprogram/utils/city-documents');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const form=(patch={})=>({regionId:'440500',birth:'1966-10',asOf:'2026-10',years:'0',balance:'0',pastAnnual:'360',tier:360,never:true,paidThisYear:'no',eligible:'yes',ordinary:'yes',...patch});

test('汕头60岁新登记答复只归本市居民，不能当成本地基础额通知',()=>{
 const id='st-resident-late-registration-2026',p=registry.capability('440500','resident'),s=p.sources.find(s=>s.id===id);
 assert.ok(s);assert.equal(s.publisher,'汕头市社会保险基金管理局');assert.equal(s.checkedAt,'2026-10-20');assert.match(s.text,/逐年缴费至65岁/);
 assert.equal(p.base,240);assert.equal(p.provincial,true);assert.match(p.referenceText,/仍待核/);assert.match(p.paymentNote,/不是60岁直接补完就领/);
 const doc=documents.find(d=>d.id===id);assert.deepEqual(doc.cityIds,['440500']);assert.equal(doc.kind,'resident');
 for(const c of registry.cities){assert.equal(c.employee.sources.some(s=>s.id===id),false);if(c.id!=='440500')assert.equal(c.resident.sources.some(s=>s.id===id),false);}
});
test('汕头60岁从未缴九档：先5次年缴再65岁补10年，不将补缴计入政府补贴',()=>{
 const p=registry.capability('440500','resident');
 for(const [i,tier]of p.tiers.entries()){
  const r=calculate(form({tier})),s=r.chosen,grant=i<3?30:60;
  assert.equal(r.paidYears,0);assert.equal(r.openingAmount,'0.00');assert.equal(s.timeline.normalYears,5);assert.equal(s.lumpYears,10);
  assert.equal(s.total,(tier*15).toFixed(2));assert.equal(s.subsidy,(grant*5).toFixed(2));assert.equal(s.account,(tier*15+grant*5).toFixed(2));
  assert.equal(s.lumpCost,(tier*10).toFixed(2));assert.equal(s.base,'250.00');assert.equal(s.low,(250+(tier*15+grant*5)/139).toFixed(2));
  assert.deepEqual(s.schedule.slice(0,5).map(x=>x.year),[2026,2027,2028,2029,2030]);assert.equal(s.schedule[5].year,2031);assert.equal(s.schedule[5].subsidy,'0.00');
  assert.equal(s.timeline.lumpAge,65);assert.equal(s.timeline.lumpMonth,'2031-10');assert.equal(s.receiptYear,2031);assert.ok(r.warnings.includes(p.paymentNote));
 }
});
test('汕头60岁已交5年：过去账户固定，只安排以后4年及65岁补6年',()=>{
 const r=calculate(form({years:'5',balance:'1800',never:false,paidThisYear:'yes'})),s=r.chosen;
 assert.equal(r.openingAmount,'1800.00');assert.equal(s.timeline.normalYears,4);assert.equal(s.lumpYears,6);assert.equal(s.total,'3600.00');assert.equal(s.subsidy,'120.00');assert.equal(s.account,'5520.00');
 assert.equal(s.lumpCost,'2160.00');assert.equal(s.low,(250+5520/139).toFixed(2));assert.equal(s.schedule[0].year,2027);assert.equal(s.receiptYear,2031);
});
test('汕头65岁从未交不能仅凭年龄补足，领取资格与普通参保条件分别校验',()=>{
 assert.throws(()=>calculate(form({birth:'1961-10'})),/确认已按规定延缴/);
 assert.throws(()=>calculate(form({eligible:'no'})),/参保资格/);
 assert.throws(()=>calculate(form({ordinary:'no'})),/普通/);
});
test('汕头已交满15年的60岁人员不被晚参保答复强制延到65岁',()=>{
 const r=calculate(form({years:'15',balance:'30000',never:false,paidThisYear:'yes'})),s=r.chosen;
 assert.equal(s.total,'0.00');assert.equal(s.lumpYears,0);assert.equal(s.receiptYear,2026);assert.equal(s.base,'240.00');assert.equal(s.account,'30000.00');assert.equal(s.low,(240+30000/139).toFixed(2));
});
