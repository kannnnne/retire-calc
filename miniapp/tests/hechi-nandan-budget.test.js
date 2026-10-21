const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies'),documents=require('../miniprogram/utils/city-documents');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const form=(patch={})=>({regionId:'451200',birth:'1966-10',asOf:'2026-10',years:'15',balance:'30000',pastAnnual:'200',tier:200,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',...patch});
test('南丹2026预算下限只供河池居民查证，不作全市完整标准或20元续行依据',()=>{
 const p=registry.capability('451200','resident'),id='hc-nandan-resident-budget-2026',s=p.sources.find(s=>s.id===id),d=documents.find(s=>s.id===id);
 assert.ok(s);assert.equal(s.checkedAt,'2026-10-20');assert.match(s.text,/预算绩效下限/);assert.match(s.text,/2024结束/);assert.match(s.text,/不作为每月养老金加发/);assert.match(s.text,/不据新项目未列20元认定原待遇已取消/);assert.equal(p.provincial,true);assert.equal(p.base,186);assert.equal(p.baseYear,2025);assert.equal(p.areas,undefined);assert.match(p.referenceText,/不是河池全市完整标准/);
 assert.deepEqual(d.cityIds,['451200']);assert.equal(d.kind,'resident');assert.match(d.publisher,/南丹县人力资源和社会保障局/);
 for(const c of registry.cities){assert.equal(c.employee.sources.some(s=>s.id===id),false);if(c.id!=='451200')assert.equal(c.resident.sources.some(s=>s.id===id),false);}
});
test('河池普通及65岁参考不混入旧南丹20元或特殊困难代缴，历史账户不重加',()=>{
 const p=registry.capability('451200','resident');
 for(const [birth,base]of [['1966-10',186],['1961-10',191]]){
  const r=calculate(form({birth})),s=r.chosen;assert.equal(r.openingAmount,'30000.00');assert.equal(s.account,'30000.00');assert.equal(s.total,'0.00');assert.equal(s.base,base.toFixed(2));assert.equal(s.low,(base+30000/139).toFixed(2));assert.match(r.referenceLabel,/广西标准参考/);assert.ok(r.warnings.some(s=>s.includes('南丹2026预算')));
 }
 for(const [i,tier]of p.tiers.entries()){
  const s=calculate(form({birth:'1971-10',years:'14',paidThisYear:'no',tier})).chosen;assert.equal(s.total,tier.toFixed(2));assert.equal(s.subsidy,p.subsidies[i].toFixed(2));assert.equal(s.account,(30000+tier+p.subsidies[i]).toFixed(2));assert.equal(s.base,'186.00');
 }
 assert.throws(()=>calculate(form({localArea:'nandan'})),/没有这个参保分区/);
});
