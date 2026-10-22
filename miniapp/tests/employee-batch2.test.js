const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/employee-registry');
const {forecast,policy}=require('../miniprogram/utils/forecast');
const {audit,report}=require('../scripts/audit-employee-coverage');
const D=require('../miniprogram/vendor/decimal');
const input=(id,patch={})=>({regionId:id,birthMonth:'1985-06',firstInsuredMonth:'2005-07',dataAsOf:'2026-10',paidMonths:240,principal:80000,interest:0,currentBase:registry.capability(id).min,historicalIndex:'0.6',contributionType:'EMPLOYEE',pauseMonths:0,customMonths:0,plan:'CUSTOM',category:'MALE',historicalRights:false,...patch});
test('第二批十省缴费、待遇和指数工资分别与公开材料独立对照',()=>{
 for(const [id,min,max,base,wage]of [
  ['140100',4198,20991,7253,6997],['150100',4907,24537,8179,8179],
  ['230100',4542,22710,7570,7570],['320100',4952,24762,8917,8254],
  ['340100',4311,21556,7999,21556/3],['360100',3915,19575,7054,6525],
  ['370100',4504,22518,7831,7506],['520100',4394.7,21973.5,7324.5,7324.5],
  ['620100',4403,22014,7594,7338],['630100',5289.6,26448,9056,8816]]){
  const p=registry.capability(id);assert.equal(p.status,'READY');assert.equal(p.min,min);assert.equal(p.max,max);assert.equal(p.pensionBase,base);assert.equal(p.indexWage,wage);
  const r=forecast(input(id)),s=r.scenarios.find(s=>s.plan==='CUSTOM');
  // 20 paid years at index .6, no future payments; account divisor at age 63.
  assert.equal(s.totalLow,new D(base).mul('.16').plus(new D(80000).div(policy.accountMonths[63])).toFixed(2),id);
  assert.equal(s.futurePersonalCost,'0.00');assert.equal(s.account,'80000.00');
 }
});
test('菏泽排除整份省级金额，切换山东其他城市正常计算，不向用户兜底省额',()=>{
 const heze=registry.capability('371700');assert.equal(heze.status,'PENDING');assert.equal(heze.min,undefined);assert.equal(heze.pensionBase,undefined);assert.equal(heze.indexWage,undefined);
 assert.match(heze.reason,/明确不含菏泽/);assert.throws(()=>forecast(input('371700')),/暂未开放/);
 const r=forecast(input('371600'));assert.equal(r.parameter.pensionBase,7831);assert.equal(registry.provinces.find(p=>p.id==='370000').cities.filter(c=>c.employee.status==='READY').length,15);
});
test('甘肃待遇2024与缴费2025混合年份明示，既不冒充当前也不把工资当计发额',()=>{
 const p=registry.capability('620100');assert.equal(p.year,2024);assert.equal(p.contributionYear,2025);assert.match(p.referenceLabel,/2024年待遇／2025年缴费/);assert.match(p.referenceText,/非2026/);
 const r=forecast(input('620100'));assert.equal(r.parameter.year,2024);assert.equal(r.parameter.status,'REFERENCE');assert.match(r.referenceNote,/2024年/);assert.match(r.referenceNote,/2025年/);
});
test('转载、PDF副本、政府搜索正文和推导参数保留来源状态',()=>{
 for(const [id,status]of [['140100','PUBLIC_NOTICE_REPRINT'],['360100','PUBLIC_NOTICE_REPRINT'],['370100','NOTICE_PDF_COPY'],['320100','GOVERNMENT_SEARCH_TEXT']])assert.equal(registry.capability(id).sourceStatus,status);
 for(const id of ['140100','150100','230100','320100','340100','360100','370100','520100','620100','630100'])for(const s of registry.capability(id).sources){assert.ok(s.publisher);assert.equal(s.checkedAt,'2026-10-22');assert.ok(s.text);}
 assert.equal(registry.capability('520100').pensionBaseMethod,'UNIFIED_FULL_SCOPE_WAGE');assert.equal(registry.capability('340100').indexWageMethod,'UPPER_LIMIT_THIRD');
});
test('六省尚缺不同条件，不用已搜到的缴费工资或网传数值冒充待遇基数',()=>{
 for(const id of ['410100','420100','460100','500100','540100','650100','659001']){const p=registry.capability(id);assert.equal(p.status,'PENDING');assert.equal(p.pensionBase,undefined);assert.throws(()=>forecast({...input('320100'),regionId:id}),/暂未开放/);}
 assert.match(registry.capability('540100').reason,/高原补贴/);assert.match(registry.capability('410100').reason,/6738/);assert.match(registry.capability('650100').reason,/兵团/);
});
test('覆盖审计正确接受混合参考年份，统计部分开放省而非宣称全覆盖',()=>{
 const a=audit();assert.deepEqual(a.errors,[]);assert.equal(a.ready,280);assert.equal(a.pending,89);assert.equal(a.readyProvinces,25);assert.equal(a.rows.find(r=>r.id==='370000').pending,1);
 const md=report().markdown;assert.match(md,/菏泽/);assert.match(md,/2024年待遇/);assert.match(md,/不宣称全国已全开/);
});
