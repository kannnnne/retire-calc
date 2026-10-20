const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies'),documents=require('../miniprogram/utils/city-documents');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const form=(patch={})=>({regionId:'441700',birth:'1971-10',asOf:'2026-10',years:'14',balance:'30000',pastAnnual:'360',tier:360,never:false,paidThisYear:'no',eligible:'yes',ordinary:'yes',...patch});
test('阳江市级最低范围由2026解读证明，江城区金额不单独扩作全市加发',()=>{
 const p=registry.capability('441700','resident');assert.equal(p.base,240);assert.equal(p.baseYear,2025);assert.equal(p.provincial,false);assert.equal(p.extraYear,3);assert.equal(p.age65Extra,undefined);assert.equal(p.ageExtras,undefined);
 for(const id of ['yj-resident-interpretation-2026','yj-jiangcheng-base-2025']){
  const s=p.sources.find(s=>s.id===id);assert.ok(s);assert.equal(s.checkedAt,'2026-10-20');assert.match(s.publisher,/阳江市/);
  const d=documents.find(d=>d.id===id);assert.deepEqual(d.cityIds,['441700']);assert.equal(d.kind,'resident');
  for(const c of registry.cities){assert.equal(c.employee.sources.some(x=>x.id===id),false);if(c.id!=='441700')assert.equal(c.resident.sources.some(x=>x.id===id),false);}
 }
 assert.match(p.referenceText,/2025年每月240元/);assert.doesNotMatch(p.referenceText,/年度额仍待核/);
 assert.throws(()=>calculate(form({localArea:'jiangcheng'})),/没有这个参保分区/);
});
test('阳江九档独立金额验证：一年一档、年缴补贴，已缴账户不随以后选档改写',()=>{
 const fees=[180,240,360,600,900,1200,1800,3600,4800];
 for(const [i,tier] of fees.entries()){
  const grant=i<3?30:60,r=calculate(form({tier})),s=r.chosen;
  assert.equal(r.openingAmount,'30000.00');assert.equal(s.timeline.normalYears,1);assert.equal(s.timeline.finalYears,15);assert.equal(s.total,tier.toFixed(2));assert.equal(s.subsidy,grant.toFixed(2));assert.equal(s.account,(30000+tier+grant).toFixed(2));assert.equal(s.base,'240.00');assert.equal(s.low,(240+(30000+tier+grant)/139).toFixed(2));assert.equal(s.receiptYear,2031);assert.equal(s.lumpYears,0);assert.equal(s.schedule.length,1);assert.equal(s.schedule[0].year,2026);
 }
});
test('阳江超过15年才长缴加发，不将高龄津贴算成基础养老金',()=>{
 for(const [birth,years,base] of [['1966-10',15,240],['1961-10',18,249],['1956-10',20,255]]){
  const s=calculate(form({birth,years:String(years),paidThisYear:'yes'})).chosen;assert.equal(s.total,'0.00');assert.equal(s.base,base.toFixed(2));assert.equal(s.low,(base+30000/139).toFixed(2));
 }
});
test('阳江普通延缴与困难群体代缴分开，不因2026新通知开放60岁任意补满',()=>{
 const s=calculate(form({birth:'1966-10',years:'5',paidThisYear:'yes'})).chosen;assert.equal(s.timeline.lumpAge,65);assert.equal(s.lumpYears,6);assert.equal(s.timeline.normalYears,4);assert.equal(s.lumpCost,'2160.00');assert.equal(s.total,'3600.00');assert.equal(s.subsidy,'120.00');assert.equal(s.receiptYear,2031);
 assert.throws(()=>calculate(form({birth:'1961-10',years:'5'})),/确认已按规定延缴/);
 assert.throws(()=>calculate(form({tier:120})),/档次/);
 assert.throws(()=>calculate(form({tier:6000})),/档次/);
});
