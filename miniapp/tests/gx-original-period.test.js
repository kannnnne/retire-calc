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
