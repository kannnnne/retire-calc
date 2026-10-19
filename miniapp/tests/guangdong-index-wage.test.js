const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies');
const documents=require('../miniprogram/utils/city-documents');
const {forecast}=require('../miniprogram/utils/forecast');
const cities=registry.cities.filter(c=>c.employee.rule==='GUANGDONG');
const sample=(patch={})=>({regionId:'440200',birthMonth:'1985-06',category:'MALE',firstInsuredMonth:'2005-07',dataAsOf:'2026-10',paidMonths:180,principal:'80000',historicalIndex:'0.6',currentBase:'5521',plan:'CUSTOM',customMonths:60,contributionType:'EMPLOYEE',...patch});

test('广东19市省模型区分指数工资9201和2025计发9493，居民参数不混入',()=>{
 assert.equal(cities.length,19);
 for(const c of cities){
  assert.equal(c.provinceId,'440000');assert.equal(c.employee.indexWage,9201);assert.equal(c.employee.pensionBase,9493);assert.equal(c.employee.year,2025);assert.equal(c.employee.effectiveFrom,'2026-07');assert.match(c.employee.referenceText,/27603元÷3推得/);assert.match(c.employee.referenceText,/不改历史平均指数/);assert.equal(c.resident.indexWage,undefined);
 }
});

test('广东省模型19市与广州两身份各三档及三种历史指数逐项独立复算',()=>{
 for(const c of [...cities,registry.city('440100')])for(const type of ['EMPLOYEE','FLEXIBLE'])for(const base of [5521,9201,27603])for(const historical of [.3,.6,1]){
  const r=forecast(sample({regionId:c.id,contributionType:type,currentBase:String(base),historicalIndex:String(historical)})),s=r.scenarios[3];
  const index=(historical*180+base/9201*60)/240,correction=index<.6?index/.6:1;
  const basic=9493*(correction+index)/2*20*.01,credit=base*.08*60,monthly=basic+(80000+credit)/117;
  assert.equal(r.indexWage,9201);assert.equal(s.index,index.toFixed(4));assert.equal(s.basic,basic.toFixed(2));assert.equal(s.totalLow,monthly.toFixed(2));assert.equal(s.totalHigh,s.totalLow);assert.equal(s.account,(80000+credit).toFixed(2));assert.equal(s.futurePersonalCost,(base*(type==='EMPLOYEE'?.08:.2)*60).toFixed(2));assert.equal(s.receiptMonth,'2048-07');
 }
});

test('已缴历史不按新工资倒算，零未来月数保留原指数与本金',()=>{
 for(const c of cities){const r=forecast(sample({regionId:c.id,historicalIndex:'0.45',customMonths:0})),s=r.scenarios[3];assert.equal(s.index,'0.4500');assert.equal(s.account,'80000.00');assert.equal(s.futureAccountCredit,'0.00');assert.equal(s.futurePersonalCost,'0.00');assert.equal(s.totalLow,null);}
});

test('省模型仍阻断2026七月前日期，广州旧模型与深圳独立待遇不被全省替换',()=>{
 for(const c of cities)assert.throws(()=>forecast(sample({regionId:c.id,dataAsOf:'2026-06'})),/2026-07/);
 const gz=forecast(sample({regionId:'440100',plan:'MINIMUM_STOP',contributionType:'FLEXIBLE'}));assert.equal(gz.indexWage,9201);assert.match(gz.referenceNote,/27603元÷3推得/);assert.equal(registry.capability('440100','employee').legacy,true);
 const sz=registry.capability('440300','employee');assert.equal(sz.rule,'SHENZHEN_NONLOCAL');assert.equal(sz.pensionBase,11293);assert.equal(sz.indexWage,9201);assert.equal(sz.nonLocalOnly,true);
 assert.equal(registry.capability('450100','employee').indexWage,6983);
});

test('省统筹原文、媒体转述和上限规则注明出处，归广州及19市职工来源',()=>{
 const adopted=registry.cities.filter(c=>c.employee.rule==='GUANGDONG'||c.id==='440100');
 for(const id of ['gd-pooling-2020','gd-index-explanation-2024','gd-index-upper-rule']){
  const d=documents.find(x=>x.id===id);assert.equal(d.kind,'employee');assert.deepEqual(d.cityIds,adopted.map(c=>c.id));
  for(const c of registry.cities){assert.ok(!c.resident.sources.some(s=>s.id===id));const p=c.employee.sources.find(s=>s.id===id);if(adopted.includes(c)){assert.equal(p.checkedAt,'2026-10-20');assert.ok(p.publisher);}else assert.equal(p,undefined);}
 }
 const s=cities[0].employee.sources.find(s=>s.id==='gd-index-explanation-2024');assert.match(s.publisher,/转述/);assert.match(s.text,/不冒称省级规范性文件/);
});

test('广州七月前后及完整日期按月份切换，旧记录日期不倒用9201',()=>{
 const {referenceWage,stale}=require('../miniprogram/utils/employee-index'),p=registry.capability('440100','employee');
 for(const asOf of ['2026-07','2026-7','2026-07-01','2026-10']){assert.equal(referenceWage(p,asOf),9201);const r=forecast(sample({regionId:'440100',dataAsOf:asOf}));assert.equal(r.indexWage,9201);assert.equal(stale(r,p,asOf),false);assert.equal(stale({...r,indexWage:9493},p,asOf),true);}
 const old=forecast(sample({regionId:'440100',dataAsOf:'2026-06',currentBase:'5510',plan:'MINIMUM_STOP',contributionType:'FLEXIBLE'}));assert.equal(old.indexWage,null);assert.equal(old.scenarios[2].totalLow,'2428.69');assert.equal(old.referenceNote,'');assert.equal(referenceWage(p,'bad'),null);
 assert.equal(stale({indexWage:undefined},registry.capability('450100','employee'),'2026-10'),false);
});
