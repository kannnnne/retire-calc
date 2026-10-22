const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/employee-registry'),{forecast}=require('../miniprogram/utils/forecast');
const documents=require('../miniprogram/utils/city-documents');
const input=(id,patch={})=>({regionId:id,birthMonth:'1985-06',firstInsuredMonth:'2005-07',dataAsOf:'2026-10',paidMonths:240,principal:80000,interest:0,currentBase:5069,historicalIndex:'0.6',contributionType:'EMPLOYEE',pauseMonths:0,customMonths:0,plan:'CUSTOM',category:'MALE',historicalRights:false,...patch});

test('新疆自治区14项开放有条件参考，12兵团项不继承省级金额',()=>{
 const cities=registry.provinces.find(p=>p.id==='650000').cities;
 assert.equal(cities.filter(c=>c.employee.status==='READY').length,14);
 assert.equal(cities.filter(c=>c.employee.status==='PENDING').length,12);
 for(const c of cities){const p=c.employee;if(c.id.startsWith('659')){
  assert.equal(p.status,'PENDING');for(const k of ['min','max','pensionBase','indexWage'])assert.equal(p[k],undefined);
  assert.throws(()=>forecast(input(c.id)),/兵团.*独立/);
 }else{
  assert.equal(p.min,5069);assert.equal(p.max,25344);assert.equal(p.pensionBase,8448);assert.equal(p.indexWage,8448);
  const s=forecast(input(c.id)).scenarios.find(s=>s.plan==='CUSTOM');
  // 8448 × (1+.6)/2 ×20×1%=1351.68; 80000/117=683.76068.
  assert.equal(s.basic,'1351.68');assert.equal(s.totalLow,'2035.44');assert.equal(s.account,'80000.00');assert.equal(s.futurePersonalCost,'0.00');
 }}
});

test('新疆未来一年成本与入账按8%，不覆盖既有账户或历史指数',()=>{
 const s=forecast(input('650100',{customMonths:12})).scenarios.find(s=>s.plan==='CUSTOM');
 assert.equal(s.futurePersonalCost,'4866.24');assert.equal(s.account,'84866.24');assert.equal(s.totalMonths,252);
 assert.equal(s.basic,'1419.27');assert.equal(s.totalLow,'2144.62');
 assert.throws(()=>forecast(input('650100',{dataAsOf:'2025-08'})),/2025-09/);
 assert.doesNotThrow(()=>forecast(input('650100',{dataAsOf:'2025-09'})));
});

test('合并推算在主结果和来源中明示，不冒充已核实的年度待遇通知',()=>{
 const p=registry.capability('650100'),r=forecast(input('650100'));
 assert.equal(p.sourceStatus,'MEDIA_MERGE_INFERENCE');assert.equal(p.pensionBaseMethod,'MEDIA_REPORTED_MERGE_ASSUMPTION');
 assert.match(r.referenceNote,/2025/);assert.match(r.referenceNote,/推算/);assert.match(r.referenceNote,/未获年度待遇通知核实/);
 const d=documents.find(d=>d.id==='xinjiang-employee-wage-merge-media');assert.equal(d.kind,'employee');assert.equal(d.cityIds.length,14);assert.ok(d.cityIds.includes('653100'));assert.ok(!d.cityIds.includes('659001'));assert.match(d.sections[0].text,/未取得/);
});

test('西藏7项保留地方退休年龄和高原补贴缺项，不以零补贴生成普通金额',()=>{
 const cities=registry.provinces.find(p=>p.id==='540000').cities;assert.equal(cities.length,7);
 for(const c of cities){assert.equal(c.employee.status,'PENDING');assert.equal(c.employee.pensionBase,undefined);assert.match(c.employee.reason,/实际在藏工作年限/);assert.match(c.employee.reason,/退休年龄/);assert.throws(()=>forecast(input(c.id)),/暂不提供金额/);}
});

test('本轮不扩大灵活就业或居民规则，也不允许新疆历史特殊权益',()=>{
 for(const id of ['650100','653100','659001','540100']){assert.equal(registry.capability(id,'flexible'),null);assert.throws(()=>forecast(input(id,{contributionType:'FLEXIBLE'})),/开放/);}
 assert.throws(()=>forecast(input('650100',{historicalRights:true})),/历史|视同|特殊/);
 assert.equal(require('../miniprogram/utils/resident-registry').cities.length,369);assert.equal(require('../miniprogram/utils/city-policies').cities.length,40);
});
