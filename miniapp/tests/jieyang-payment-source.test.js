const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies');
const documents=require('../miniprogram/utils/city-documents');
const {calculate}=require('../miniprogram/resident/utils/calculate');

test('揭阳年缴通知只进入本市居民资料，不将缴费频率通知当作本地待遇续期',()=>{
 const id='jy-resident-annual-2023',p=registry.capability('445200','resident');
 const s=p.sources.find(s=>s.id===id);assert.ok(s);assert.match(s.text,/统一按年缴费/);assert.match(s.text,/不延长2020年/);
 assert.equal(s.checkedAt,'2026-10-19');assert.equal(p.provincial,true);assert.equal(p.base,240);
 const d=documents.find(d=>d.id===id);assert.deepEqual(d.cityIds,['445200']);assert.equal(d.kind,'resident');
 for(const c of registry.cities){assert.equal(c.employee.sources.some(s=>s.id===id),false);if(c.id!=='445200')assert.equal(c.resident.sources.some(s=>s.id===id),false);}
});

test('揭阳九档正常续缴仍按年记账，不因年缴通知开放60岁普通一次补足',()=>{
 const p=registry.capability('445200','resident');
 for(const [i,tier] of p.tiers.entries()){
  const r=calculate({regionId:'445200',birth:'1966-10',asOf:'2026-10',years:'14',balance:'30000',pastAnnual:'360',tier,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes'});
  assert.equal(r.chosen.total,tier.toFixed(2));assert.equal(r.chosen.subsidy,(i<3?30:60).toFixed(2));assert.equal(r.chosen.lumpYears,0);assert.equal(r.chosen.receiptYear,2027);
 }
 const r=calculate({regionId:'445200',birth:'1966-10',asOf:'2026-10',years:'5',balance:'1800',pastAnnual:'360',tier:360,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes'});
 assert.equal(r.chosen.timeline.lumpAge,65);assert.ok(r.chosen.receiptYear>=2031);
});
