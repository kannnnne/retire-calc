const test=require('node:test'),assert=require('node:assert/strict');
const {forecast}=require('../miniprogram/utils/forecast');
const registry=require('../miniprogram/utils/city-policies');
const documents=require('../miniprogram/utils/city-documents');
const sample=(patch={})=>({regionId:'440300',szScopeConfirmed:'yes',birthMonth:'1985-06',category:'MALE',firstInsuredMonth:'2005-07',dataAsOf:'2026-10',paidMonths:180,principal:'80000',historicalIndex:'0.6',currentBase:'5521',plan:'MINIMUM_STOP',contributionType:'EMPLOYEE',...patch});

test('深圳未来指数用全口径工资推算值9201，计发11293与省参考9493不混用',()=>{
 const p=registry.capability('440300','employee');assert.equal(p.indexWage,27603/3);assert.equal(p.pensionBase,11293);assert.match(p.referenceText,/推得/);assert.match(p.referenceText,/省市就高对比差额/);
 for(const id of ['sz-index-wage-2024','sz-index-upper-rule-2026']){const d=documents.find(x=>x.id===id);assert.deepEqual(d.cityIds,['440300']);assert.equal(d.kind,'employee');assert.equal(p.sources.find(s=>s.id===id).checkedAt,'2026-10-19');for(const c of registry.cities){assert.ok(!c.resident.sources.some(s=>s.id===id));if(c.id!=='440300')assert.ok(!c.employee.sources.some(s=>s.id===id));}}
});

test('深圳两身份、低中高档及不同历史指数的金额由独立公式复算',()=>{
 for(const type of ['EMPLOYEE','FLEXIBLE'])for(const base of [5521,9201,27603])for(const historic of [.3,.6,1]){
  const r=forecast(sample({currentBase:String(base),historicalIndex:String(historic),contributionType:type,plan:'CUSTOM',customMonths:60})),s=r.scenarios.find(s=>s.plan==='CUSTOM');
  const index=(historic*180+base/9201*60)/240,credit=base*.08*60,monthly=11293*(1+index)/2*20*.01+(80000+credit)/117;
  assert.equal(r.indexWage,9201);assert.equal(s.index,index.toFixed(4));assert.equal(s.totalLow,monthly.toFixed(2));assert.equal(s.totalHigh,s.totalLow);assert.equal(s.futureAccountCredit,credit.toFixed(2));assert.equal(s.futurePersonalCost,(base*(type==='EMPLOYEE'?.08:.2)*60).toFixed(2));assert.equal(s.receiptMonth,'2048-07');
 }
});

test('深圳修正保留历史输入及身份阻断，广东其他城市与广西暂存口径不受影响',()=>{
 const r=forecast(sample({historicalIndex:'0.45',plan:'CUSTOM',customMonths:0}));assert.equal(r.scenarios[3].index,'0.4500');assert.equal(r.scenarios[3].account,'80000.00');assert.equal(r.scenarios[3].qualified,false);
 assert.throws(()=>forecast(sample({szScopeConfirmed:'unknown'})),/深圳实缴累计满10年/);assert.throws(()=>forecast(sample({dataAsOf:'2026-06'})),/2026-07/);
 for(const id of ['440200','440600','441900'])assert.equal(registry.capability(id,'employee').indexWage,9493);
 assert.equal(registry.capability('450100','employee').indexWage,6983);
});
