// Manual/annual-only fixtures explicitly opt out of the default automatic plan.
const test=require('node:test'),assert=require('node:assert/strict');
const {page}=require('../scripts/resident-module-harness'),flow=require('../miniprogram/resident/utils/module-flow');
const {guidance}=require('../miniprogram/resident/utils/receipt-guidance');
const engine=require('../miniprogram/resident/utils/calculate');
function basic(id='450800'){const q=page('basic');q.onLoad();q.setData({'form.makeupStrategy':'ANNUAL_ONLY'});q.regionChoice({detail:{regionId:id}});if(id==='330100'){q.localArea({detail:{value:1}});q.setData({'form.tier':5000});}q.setData({'form.age':'60','form.asOf':'2026-10'});q.calculate();assert.ok(q.data.result,q.data.error);return q;}
test('主动不补往年时贵港60岁0年复现74岁逐年方案，明确不是领取年龄规定且不自动审批补缴',()=>{
 const q=basic(),s=q.data.result.chosen;assert.equal(s.timeline.receivingAge,74);assert.equal(s.receiptMonth,'2040-11');assert.equal(s.total,'90000.00');assert.equal(q.data.display.monthly,860);
 assert.match(q.data.display.receiptGuide.text,/不是当地规定/);assert.equal(q.data.result.makeup,null);
 q.makeup();const session=q.sessions,calc=page('calc',session);calc.onLoad({module:'makeup',transfer:'1'});assert.equal(calc.data.form.age,'60');assert.equal(calc.data.form.years,'0');calc.moduleCalculate();assert.equal(calc.data.registrationPlan,false);assert.equal(calc.data.form.gxScopeReviewed,'unknown');assert.ok(calc.data.result);assert.equal(calc.data.result.chosen.timeline.receivingAge,60);
});
test('广西已登记且核准2012—2025漏年时，可由既有引擎算60岁起领，不能按现档补所有历史年度',()=>{
 const form={...flow.input(flow.defaults({regionId:'450800',ageOnly:false,birth:'1966-10',asOf:'2026-10',tier:200})),never:false,gxScopeReviewed:'yes',gxStartYear:'2012',gxMakeupRows:[{mode:'missing',start:'2012',end:'2025',target:200}]};
 const result=engine.calculate(form);assert.equal(result.chosen.timeline.receivingAge,60);assert.equal(result.chosen.receiptMonth,'2026-11');assert.equal(result.chosen.total,'3000.00');assert.equal(result.makeup.addedYears,14);assert.equal(guidance(result),null);
 assert.throws(()=>engine.calculate({...form,gxScopeReviewed:'unknown'}),/核对/);
 assert.throws(()=>engine.calculate({...form,gxMakeupRows:[{mode:'missing',start:'2012',end:'2025',target:6000}]}),/2012年/);
});
test('补缴模块原逐年结果也明确范围，并能去核对未参保办理而不丢原结果',()=>{
 const q=page('calc');q.onLoad();q.setData({'form.makeupStrategy':'ANNUAL_ONLY','form.regionId':'450800','form.age':'60','form.asOf':'2026-10','form.never':true,'form.years':'0','form.balance':'0','form.pastAnnual':'','form.paidThisYear':'no','form.tier':200});q.refreshPolicyQuestions();q.calculate();assert.ok(q.data.result,q.data.error);assert.ok(q.data.display.receiptGuide);const original=JSON.stringify(q.data.result);q.reviewReceiptOptions();assert.equal(q.data.registrationPlan,true);q.closeRegistrationPlan();assert.equal(JSON.stringify(q.data.result),original);
});
test('其他地区逐年延后结果共用提示，现有到龄补足方案不被改为逐年或误标',()=>{
 for(const id of ['310100','500100'])assert.ok(basic(id).data.display.receiptGuide);
 for(const id of ['440100','440300','330100']){const q=basic(id);assert.ok(q.data.result.chosen.lumpYears);assert.equal(q.data.display.receiptGuide,null);}
 assert.equal(guidance(null),null);assert.equal(guidance({chosen:{timeline:{receivingAge:60,normalYears:15}}}),null);
});
test('个人图与PK保留逐年范围，接收者不会把74岁当当地统一年龄',()=>{
 const q=basic(),cards=require('../miniprogram/utils/share-card'),p=cards.fromPage('resident',q.data);assert.match(p.personal.planName,/逐年缴费/);
 const c=require('../miniprogram/utils/card-layout').layout(cards.model(p,'personal',true),true);assert.ok(c.ops.some(x=>/未计历史补缴/.test(x.text||'')));
 const snapshot=require('../miniprogram/resident/utils/tier-pk').snapshot(q.data);assert.ok(snapshot.facts.some(x=>x.label==='方案范围'&&/逐年/.test(x.value)));
});
