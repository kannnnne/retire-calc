const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/resident-registry'),flow=require('../miniprogram/resident/utils/module-flow');
const calculate=require('../miniprogram/resident/utils/automatic-calculate').calculate;
const rules=require('../miniprogram/resident/utils/default-makeup-policies');
function input(id,age=55,tier){const f=flow.input(flow.defaults({regionId:id,ageOnly:false,birth:(2026-age)+'-10',asOf:'2026-10',...(tier==null?{}:{tier})}));if(tier!=null)f.tier=tier;return f;}
const affected=registry.cities.filter(c=>rules.get(c.id));
test('新增默认路径逐地区复核55/60/65岁；补费入账、补足年数及范围标识一致',()=>{
 assert.equal(affected.length,72);
 for(const c of affected)for(const age of [55,60,65]){
  if(c.id==='110100'&&age<65)continue;
  const f=input(c.id,age,c.resident.annualInput?500:undefined),before=JSON.stringify(f),r=calculate(f),s=r.chosen,p=rules.get(c.id);
  const expected=p.mode==='MISSING'&&age>=60?age+2:Math.max(age,60);
  assert.equal(s.timeline.receivingAge,expected,c.id+'/'+age);assert.equal(s.timeline.finalYears,15,c.id);
  assert.equal(JSON.stringify(f),before);assert.equal(Number(s.interest?s.interest.accountWithoutInterest:s.account),Number(s.total)+Number(s.subsidy));
  if(p.mode==='MISSING'){assert.equal(r.makeup.addedYears,age===55?9:12);assert.equal(r.autoPlan.limited,age>=60);assert.ok(r.makeup.entries.every(e=>e.year>=2014&&e.year<2026&&e.subsidy==='0.00'));}
  else {assert.equal(s.lumpYears,age===55?10:15);assert.equal(s.timeline.normalYears,age===55?5:0);}
  assert.ok(r.sources.some(s=>s.checkedAt==='2026-10-30'));
 }
});
test('辽宁吉林旧档独立计费，新高档不倒套旧年，补漏无补贴',()=>{
 const ln=calculate(input('210100',55,5000)),jl=calculate(input('220100',55,5000));
 assert.equal(ln.makeup.cost,'25000.00'); // 2017/18:2000; 2019..25:3000
 assert.equal(jl.makeup.cost,'21000.00'); // 2017..24:2000; 2025:5000
 assert.equal(ln.chosen.timeline.normalYears,6);assert.equal(jl.chosen.timeline.normalYears,6);
 assert.equal(ln.makeup.subsidy,'0.00');assert.equal(jl.makeup.subsidy,'0.00');
 const low=ln.scenarios.find(s=>s.annual===200);assert.equal(low.immediateCost,'1800.00');assert.notEqual(low.immediateCost,ln.chosen.immediateCost);
});
test('已有分年记录、已知余额保持；补缴不再重复已有年份，不重复加入过去本金',()=>{
 for(const id of ['210100','220100','620100','650100']){
  const f={...input(id,60),never:false,years:'5',balance:'95000',historyMode:'segments',segments:[{start:'2010',end:'2014',annual:'200'}]},r=calculate(f),s=r.chosen;
  assert.equal(s.timeline.receivingAge,60);assert.equal(r.paidYears,5);assert.equal(r.makeup.addedYears,9);assert.ok(r.makeup.entries.every(e=>e.year>=2015));
  assert.equal(Number(s.account),95000+Number(s.total)+Number(s.subsidy));
 }
});
test('已够年限、手动方案、仅逐年选择不叠加默认补缴；跨地区不借广西起点',()=>{
 for(const id of ['120100','150100','410100','210100']){
  const f={...input(id,60),never:false,years:'15',balance:'10000',paidThisYear:'yes'},r=calculate(f);
  assert.equal(r.chosen.total,'0.00');assert.equal(r.autoPlan,null);
  const annual=calculate({...input(id,55),makeupStrategy:'ANNUAL_ONLY'});assert.equal(annual.autoPlan,null);assert.equal(annual.chosen.timeline.receivingAge,69);
 }
 assert.equal(calculate({...input('210100',55),gxStartYear:'2020'}).makeup.addedYears,9);
});
test('北京严格出生界限不套迁京身份；上海、四川期限外和兵团不被全国一刀切补足',()=>{
 const build=require('../miniprogram/resident/utils/automatic-makeup').build;
 assert.equal(build({autoMakeup:'yes',regionId:'110100'},{rule:'BEIJING_ORDINARY'},{birth:1964*12,asOf:2026*12+9,years:0}),null);
 assert.equal(calculate(input('110100',65,1000)).chosen.timeline.receivingAge,65);
 assert.equal(calculate(input('310100',55)).chosen.timeline.receivingAge,69);
 assert.equal(calculate(input('510300',55)).autoPlan,null);
 assert.equal(calculate(input('659001',55,500)).autoPlan,null);
});
test('乌鲁木齐现行补漏期限与自治区隔离；政策页可读新增来源',()=>{
 const f=input('650100',55),r=calculate(f);assert.equal(r.chosen.timeline.receivingAge,60);
 assert.equal(calculate({...f,asOf:'2029-10',birth:'1974-10'}).autoPlan,null);
 assert.equal(rules.get('650200'),null);assert.equal(rules.get('659001'),null);
 const region=require('../miniprogram/resident/data/regions').getRegion('410100');assert.ok(region.sources.some(s=>s.id==='henan-procedure-lump'));
});
test('PK与个人图使用新计划，部分年度模型的范围随图片传递',()=>{
 const f=input('210100',60,5000),r=calculate(f),data={form:f,region:require('../miniprogram/resident/data/regions').getRegion(f.regionId),result:r,display:flow.display(r)};
 const card=require('../miniprogram/utils/share-card').fromPage('resident',data);assert.match(card.personal.planName,/未含更早可补年度/);
 const pk=require('../miniprogram/resident/utils/tier-pk'),t=pk.table(pk.snapshot(data),[200,5000]);
 assert.deepEqual(t.rows.find(x=>x.label==='其中：补缴').values,['2,400元\n补12年','31,000元\n补12年']);
});
test('2.47旧会话重进按新补缴规则重算，保留年龄和地区；补缴页换档同步补费',()=>{
 const {page}=require('../scripts/resident-module-harness'),q=page('basic');q.onLoad();q.regionChoice({detail:{regionId:'120100'}});q.setData({'form.age':'55','form.asOf':'2026-10'});q.calculate();
 const old=require('../miniprogram/resident/utils/calculate').calculate(flow.input(q.data.form));old.calculationVersion='AUTO_MAKEUP_V1';assert.equal(old.chosen.timeline.receivingAge,69);
 const next=page('basic',{'resident-basic':{...q.data,result:old}});next.onLoad();assert.equal(next.data.result.chosen.timeline.receivingAge,60);assert.equal(next.data.form.age,'55');assert.equal(next.data.form.regionId,'120100');
 const c=page('calc');c.onLoad({module:'makeup'});c.regionChoice({detail:{regionId:'210100'}});c.setData({'form.age':'55','form.asOf':'2026-10','form.never':true,'form.years':'0','form.balance':'0','form.paidThisYear':'no','form.tier':5000});c.moduleCalculate();assert.ok(c.data.result,c.data.error);assert.equal(c.data.result.makeup.cost,'25000.00');
 c.chooseFuture({currentTarget:{dataset:{annual:200}}});assert.equal(c.data.result.makeup.cost,'1800.00');assert.equal(c.data.result.chosen.timeline.receivingAge,60);
});
