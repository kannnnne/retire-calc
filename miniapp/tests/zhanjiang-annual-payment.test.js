const test=require('node:test'),assert=require('node:assert/strict');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const registry=require('../miniprogram/utils/city-policies'),documents=require('../miniprogram/utils/city-documents');
const form=(patch={})=>({regionId:'440800',birth:'1971-10',asOf:'2026-10',years:'5',pastAnnual:'360',balance:'',tier:4800,never:false,paidThisYear:'no',eligible:'yes',ordinary:'yes',...patch});
test('湛江2026调档过期后今年实际档与以后九档分开，不改已固定费用',()=>{
 assert.throws(()=>calculate(form()),/今年实际/);
 const r=calculate(form({currentYearTier:360})),s=r.chosen;assert.equal(s.total,'43560.00');assert.equal(s.subsidy,'570.00');assert.equal(s.timeline.lockedAnnual,360);assert.equal(s.timeline.futureFirstYear,2027);assert.equal(s.timeline.futureNormalYears,9);assert.equal(s.timeline.normalCost,'43560.00');assert.equal(s.account,'45930.00');
 for(const x of r.scenarios){assert.equal(x.schedule[0].cost,'360');assert.equal(x.schedule[0].subsidy,'30.00');assert.equal(Number(x.total),360+x.annual*9);assert.equal(x.schedule[1].cost,String(x.annual));}
});
test('湛江期限只锁2026四月起未缴且需要年缴的情形，不给所有年度设三月缴费截止',()=>{
 for(const asOf of ['2026-01','2026-03','2027-04'])assert.equal(calculate(form({asOf})).chosen.timeline.lockedYear,null);
 const paid=calculate(form({paidThisYear:'yes'})).chosen;assert.equal(paid.timeline.lockedYear,null);assert.equal(paid.total,'48000.00');
 const last=calculate(form({years:'14',currentYearTier:360}));assert.equal(last.chosen.total,'360.00');assert.ok(last.scenarios.every(x=>x.low===last.chosen.low));
 assert.equal(calculate(form({birth:'1961-10',extended:'yes'})).chosen.timeline.lockedYear,null);
});
test('湛江2026税务原文仅供本市居民使用，不作为全省或职工缴费截止',()=>{
 const d=documents.find(s=>s.id==='zj-resident-tier-deadline-2026');assert.deepEqual(d.cityIds,['440800']);assert.equal(d.kind,'resident');
 const p=registry.capability('440800','resident');assert.match(p.paymentNote,/不是最终缴费截止/);assert.match(p.sources.find(s=>s.id===d.id).text,/新参保也不能选档/);
 for(const c of registry.cities){assert.ok(!c.employee.sources.some(s=>s.id===d.id));if(c.id!=='440800')assert.ok(!c.resident.sources.some(s=>s.id===d.id));}
});
