const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies');
const documents=require('../miniprogram/utils/city-documents');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const transition=require('../miniprogram/resident/utils/gx-transition');
const gx=registry.cities.filter(c=>c.provinceId==='450000');
const form=(patch={})=>({regionId:'450700',birth:'1960-10',asOf:'2026-10',years:'9',balance:'30000',pastAnnual:'200',tier:200,never:false,paidThisYear:'no',eligible:'yes',ordinary:'yes',gxTransitionEnabled:'yes',gxTransitionStart:'2012-01',gxTransitionYears:'6',gxTransitionReviewed:'yes',...patch});

test('广西14市不允许把2013以后、2014并轨或首次缴费时间当原制度年月',()=>{
 assert.equal(gx.length,14);
 for(const c of gx)for(const start of ['2013-01','2013-12','2014-01','2014-12','2020-01'])assert.throws(()=>calculate(form({regionId:c.id,gxTransitionStart:start})),/2012年已实现.*原制度年月/);
 for(const c of gx){const r=calculate(form({regionId:c.id,birth:'1966-10',years:'14',gxTransitionEnabled:'no'}));assert.equal(r.chosen.timeline.normalYears,1);assert.equal(r.chosen.lumpYears,0);assert.equal(r.chosen.total,'200.00');assert.equal(r.chosen.subsidy,'35.00');assert.equal(r.chosen.receiptYear,2026);}
});

test('全覆盖年份不变成统一默认月份，已确认的原制度日期仍可算且历史金额不变',()=>{
 for(const c of gx){
  assert.equal(c.resident.gxSchemeStart,undefined);
  const r=calculate(form({regionId:c.id}));assert.equal(r.transition.schemeStart,'2012-01');assert.equal(r.transition.coverageYear,2012);assert.equal(r.chosen.total,'1200.00');assert.equal(r.chosen.subsidy,'210.00');assert.equal(r.chosen.account,'31410.00');assert.equal(transition.stale(r),false);
  const ordinary=calculate(form({regionId:c.id,gxTransitionEnabled:'no',gxTransitionStart:'2014-01'}));assert.equal(ordinary.transition,null);assert.equal(ordinary.chosen.lumpYears,0);assert.equal(ordinary.chosen.timeline.normalYears,6);
 }
 for(const area of ['xingning','qingxiu']){const r=calculate(form({regionId:'450100',localArea:area,gxTransitionStart:'',years:'10',gxTransitionYears:'5'}));assert.equal(r.transition.schemeStart,'2011-07');assert.equal(r.transition.coverageYear,2012);}
});

test('历史覆盖原件只作用广西居民，未采用旧55元或将旧方案当现行补缴授权',()=>{
 for(const id of ['gx-rural-coverage-2012','gx-urban-coverage-2012']){
  const doc=documents.find(x=>x.id===id);assert.equal(doc.kind,'resident');assert.deepEqual(doc.cityIds,gx.map(c=>c.id));
  for(const c of registry.cities){assert.ok(!c.employee.sources.some(s=>s.id===id));const s=c.resident.sources.find(s=>s.id===id);if(c.provinceId==='450000'){assert.equal(s.checkedAt,'2026-10-20');assert.equal(s.publisher,'广西壮族自治区人民政府办公厅');assert.ok(c.resident.base>=186);assert.match(s.text,/历史|旧方案/);}else assert.equal(s,undefined);}
 }
});

test('原制度范围更新后旧核定缓存应重算，当前正确结果与普通结果可保留',()=>{
 const r=calculate(form()),old=JSON.parse(JSON.stringify(r));delete old.transition.coverageYear;assert.equal(transition.stale(old),true);
 const late=JSON.parse(JSON.stringify(r));late.transition.schemeStart='2014-01';assert.equal(transition.stale(late),true);
 assert.equal(transition.stale(r),false);assert.equal(transition.stale({...r,transition:null}),false);assert.equal(transition.stale(null),false);
});

test('广西首批试点前的2009年1至9月不接受，旧早期日期缓存清除',()=>{
 for(const c of gx)for(let month=1;month<=9;month++)assert.throws(()=>calculate(form({regionId:c.id,birth:'1956-10',years:'8',gxTransitionYears:'7',gxTransitionStart:'2009-'+String(month).padStart(2,'0')})),/2009年10月起启动/);
 // Synthetic county-confirmed boundary case; not an assertion that all 14
 // cities or every original urban scheme began in October 2009.
 const r=calculate(form({birth:'1956-10',years:'8',gxTransitionYears:'7',gxTransitionStart:'2009-10'}));assert.equal(r.transition.schemeStart,'2009-10');assert.equal(r.chosen.total,'1400.00');assert.equal(r.chosen.subsidy,'245.00');assert.equal(r.chosen.account,'31645.00');assert.equal(r.chosen.low,(191+31645/139).toFixed(2));
 const old=JSON.parse(JSON.stringify(r));old.transition.schemeStart='2009-01';assert.equal(old.transition.coverageYear,2012);assert.equal(transition.stale(old),true);assert.equal(transition.stale(r),false);
});

test('2009试点与2026问答标明用途，归广西14市居民，不替换本地长缴或默认县区日期',()=>{
 for(const id of ['gx-resident-first-pilot-2009','gx-resident-qa-2026-07']){
  const doc=documents.find(x=>x.id===id);assert.equal(doc.kind,'resident');assert.deepEqual(doc.cityIds,gx.map(c=>c.id));
  for(const c of registry.cities){assert.ok(!c.employee.sources.some(s=>s.id===id));const s=c.resident.sources.find(s=>s.id===id);if(c.provinceId==='450000'){assert.equal(s.checkedAt,'2026-10-20');assert.ok(s.publisher);}else assert.equal(s,undefined);}
 }
 for(const c of gx)assert.equal(c.resident.gxSchemeStart,undefined);
 assert.equal(registry.capability('450900','resident').extraYear,4);assert.equal(registry.capability('450700','resident').extraYear,2);
 const p=gx[0].resident.sources.find(s=>s.id==='gx-resident-qa-2026-07');assert.match(p.text,/只是自治区下限/);assert.match(p.text,/不按当前年龄自动批准/);
});

test('日期下界只限老制度入口，不把2009原制度年月当历史欠费当前档授权',()=>{
 assert.throws(()=>calculate(form({birth:'1956-10',years:'8',gxTransitionEnabled:'no',gxStartYear:'2009',gxScopeReviewed:'yes',gxMakeupRows:[{mode:'missing',start:'2009',end:'2009',target:6000}]})),/2010|起点|年度/);
 const normal=calculate(form({gxTransitionEnabled:'no',gxTransitionStart:'2009-01'}));assert.equal(normal.transition,null);assert.equal(normal.chosen.lumpYears,0);assert.equal(normal.chosen.timeline.normalYears,6);
});
