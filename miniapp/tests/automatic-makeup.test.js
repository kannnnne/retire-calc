const test=require('node:test'),assert=require('node:assert/strict');
const {page}=require('../scripts/resident-module-harness');
const pk=require('../miniprogram/resident/utils/tier-pk'),flow=require('../miniprogram/resident/utils/module-flow');
function basic(age=55,id='450800',tier){const q=page('basic');q.onLoad();q.regionChoice({detail:{regionId:id}});q.setData({'form.age':String(age),'form.asOf':'2026-10',...(tier==null?{}:{'form.tier':tier})});q.calculate();assert.ok(q.data.result,q.data.error);return q;}
test('截图贵港55岁0年默认自动补足，实际从69岁改为60岁，年档费用逐年受旧上限约束',()=>{
 const q=basic(),r=q.data.result,s=r.chosen;assert.equal(s.receiptMonth,'2031-11');assert.equal(s.timeline.receivingAge,60);assert.equal(s.timeline.normalYears,6);assert.equal(r.makeup.addedYears,9);assert.equal(r.makeup.cost,'46000.00');assert.equal(s.total,'82000.00');assert.equal(q.data.display.monthly,880);assert.equal(s.timeline.finalYears,15);
 assert.equal(q.data.form.never,undefined);assert.equal(q.data.form.gxScopeReviewed,undefined);assert.equal(r.approvedPlan,null);assert.ok(r.autoPlan);assert.equal(r.paidYears,0);
 assert.deepEqual(r.makeup.entries.filter(x=>x.year<2019).map(x=>x.cost),['2000.00','2000.00']);assert.equal(s.subsidy,'1200.00');
});
test('贵港60及65岁未交够，直接补往年＋今年缴费后次月领，不再继续排15年',()=>{
 for(const age of [60,65]){const q=basic(age),r=q.data.result;assert.equal(r.chosen.receiptMonth,'2026-11');assert.equal(r.chosen.timeline.receivingAge,age);assert.equal(r.chosen.timeline.normalYears,1);assert.equal(r.makeup.addedYears,14);assert.equal(r.makeup.cost,'54000.00');assert.equal(r.chosen.total,'60000.00');assert.equal(r.chosen.subsidy,'200.00');assert.equal(q.calls.filter(x=>x.showCancel!==undefined).length,0);}
});
test('每档补缴重新按历史上限计费，PK费用和个人换档同步，不锁死6000档的补费',()=>{
 const q=basic(),r=q.data.result,low=r.scenarios.find(x=>x.annual===200),high=r.chosen;
 assert.equal(low.immediateCost,'1800.00');assert.equal(low.total,'3000.00');assert.equal(high.immediateCost,'46000.00');assert.equal(high.total,'82000.00');
 const table=pk.table(pk.snapshot(q.data),[200,6000]);assert.deepEqual(table.rows.find(x=>x.label==='其中：补缴').values,['1,800元\n补9年','46,000元\n补9年']);
 const c=page('calc');c.onLoad({module:'makeup'});c.regionChoice({detail:{regionId:'450800'}});c.setData({'form.age':'55','form.asOf':'2026-10','form.never':true,'form.years':'0','form.balance':'0','form.paidThisYear':'no','form.tier':6000});c.moduleCalculate();assert.ok(c.data.result,c.data.error);assert.equal(c.data.registrationPlan,false);assert.equal(c.data.quickPlan,null);c.chooseFuture({currentTarget:{dataset:{annual:200}}});assert.equal(c.data.result.makeup.cost,'1800.00');assert.equal(c.data.display.payback.total,'3000.00');assert.equal(c.data.paymentBreakdown.nowCost,'2000.00');
});
test('已有分年记录不重复补已交年份，账户不重复加入过去本金，不生成已核记录',()=>{
 const calc=require('../miniprogram/resident/utils/automatic-calculate').calculate;
 const f={...flow.input(flow.defaults({regionId:'450800',ageOnly:false,birth:'1967-11',asOf:'2026-10',tier:6000})),never:false,years:'5',balance:'95000',historyMode:'segments',segments:[{start:'2021',end:'2021',annual:'200'},{start:'2023',end:'2026',annual:'200'}],paidThisYear:'yes'};
 const before=JSON.stringify(f),r=calc(f);assert.equal(JSON.stringify(f),before);assert.equal(r.paidYears,5);assert.equal(r.chosen.timeline.receivingAge,60);assert.equal(r.makeup.addedYears,9);assert.ok(r.makeup.entries.some(x=>x.year===2022));assert.ok(r.makeup.entries.every(x=>![2021,2023,2024,2025,2026].includes(x.year)));assert.equal(Number(r.chosen.interest.accountWithoutInterest),95000+Number(r.chosen.total)+200);assert.equal(r.pastPaid,null);
});
test('已交满15年不再补，已有手填补缴不再叠加自动记录',()=>{
 const calc=require('../miniprogram/resident/utils/automatic-calculate').calculate,raw=require('../miniprogram/resident/utils/calculate').calculate;
 const f={...flow.input(flow.defaults({regionId:'450800',ageOnly:false,birth:'1966-10',asOf:'2026-10',tier:200})),never:false,years:'15',balance:'10000',paidThisYear:'yes'};const r=calc(f);assert.equal(r.autoPlan,null);assert.equal(r.makeup,null);assert.equal(r.chosen.total,'0.00');
 const manual={...f,years:'5',paidThisYear:'no',gxStartYear:'2012',gxScopeReviewed:'yes',gxMakeupRows:[{mode:'missing',start:'2012',end:'2012',target:200}]};assert.equal(calc(manual).chosen.total,raw(manual).chosen.total);assert.equal(calc(manual).makeup.addedYears,1);
});
test('已有明确60岁补足地区自动接入，65岁补足地区不再卡延缴勾选，政策来源随结果',()=>{
 for(const id of ['140100','370100']){const q=basic(60,id,500);assert.equal(q.data.result.chosen.timeline.receivingAge,60);assert.equal(q.data.result.chosen.timeline.normalYears,0);assert.equal(q.data.result.chosen.lumpYears,15);assert.equal(q.data.result.chosen.subsidy,'0.00');assert.ok(q.data.result.sources.some(s=>/补足|补缴/.test(s.name)));}
 for(const id of ['440100','440300'])assert.equal(basic(65,id).data.result.chosen.timeline.receivingAge,65);
});
test('海南未来延缴5年后自动补足，已交5个60岁后年度的人65岁直接补足',()=>{
 assert.equal(basic(55,'460100').data.result.chosen.timeline.receivingAge,65);
 const c=page('calc');c.onLoad({module:'makeup'});c.regionChoice({detail:{regionId:'460100'}});c.setData({'form.age':'65','form.asOf':'2026-10','form.years':'5','form.pastAnnual':'200','form.paidThisYear':'yes','form.tier':200});c.moduleCalculate();assert.ok(c.data.result,c.data.error);assert.equal(c.data.result.chosen.timeline.receivingAge,65);assert.equal(c.data.result.chosen.lumpYears,10);assert.ok(!c.data.approvedPlanning);
});
test('可主动选不补往年作对照，返回自动方案恢复60岁，历史事实不改',()=>{const q=basic();const cost=q.data.result.chosen.total;q.toggleAutoMakeup();assert.equal(q.data.result.chosen.timeline.receivingAge,69);assert.equal(q.data.result.makeup,null);q.toggleAutoMakeup();assert.equal(q.data.result.chosen.timeline.receivingAge,60);assert.equal(q.data.result.chosen.total,cost);});
test('回本与累计年龄各归自己的金额单元格，只显示周岁，页面和海报同源',()=>{
 const q=basic(),p=pk.snapshot(q.data),t=pk.table(p,[200,6000],20),recovery=t.rows.find(x=>x.label==='领取后回本'),cumulative=t.rows.find(x=>x.label==='领取20年累计');assert.equal(recovery.subtitle,undefined);assert.equal(cumulative.subtitle,undefined);assert.ok(recovery.values.every(x=>/（\d+岁）$/.test(x)));assert.notEqual(recovery.values[0].match(/（.*）/)[0],recovery.values[1].match(/（.*）/)[0]);assert.ok(cumulative.values.every(x=>x.endsWith('（80岁）')));assert.ok(![...recovery.values,...cumulative.values].some(x=>/岁\d+个月/.test(x)));
 const image=require('../miniprogram/utils/pk-layout').layout(t,true,true);assert.ok(image.ops.some(x=>x.x>234&&/（\d+岁）/.test(x.text||'')));assert.ok(!image.ops.some(x=>x.x<234&&/^（\d+岁）$/.test(x.text||'')));
});


test('旧会话中的69岁逐年结果重进即按新规则重算，不必重置填写',()=>{
 const q=basic(),f=flow.input(q.data.form),old=require('../miniprogram/resident/utils/calculate').calculate(f);assert.equal(old.chosen.timeline.receivingAge,69);
 const saved={...q.data,result:old,display:flow.display(old)},next=page('basic',{'resident-basic':saved});next.onLoad();assert.equal(next.data.result.chosen.timeline.receivingAge,60);assert.equal(next.data.result.calculationVersion,'AUTO_MAKEUP_INTEREST_V3');assert.equal(next.data.form.age,'55');
});
test('四川期限之外不假设政策续期，普通年轻人已有足够正常年度时不额外补钱',()=>{
 const build=require('../miniprogram/resident/utils/automatic-makeup').build,policy={rule:'SICHUAN_ORDINARY'};
 assert.equal(build({autoMakeup:'yes',regionId:'510600',asOf:'2026-10',years:'0'},policy,{birth:1971*12+9,asOf:2026*12+9,years:0}),null);
 const q=basic(30);assert.equal(q.data.result.makeup,null);assert.equal(q.data.result.chosen.total,'90000.00');assert.equal(q.data.result.chosen.timeline.receivingAge,60);
});


test('已明确填写的60岁前缴费不能冒充海南60岁后的5个延缴年度',()=>{
 const calc=require('../miniprogram/resident/utils/automatic-calculate').calculate,f={...flow.input(flow.defaults({regionId:'460100',ageOnly:false,birth:'1961-10',asOf:'2026-10',tier:200})),never:false,years:'5',historyMode:'segments',segments:[{start:'2010',end:'2014',annual:'200'}],balance:'1000',paidThisYear:'no'};
 const r=calc(f);assert.equal(r.chosen.timeline.receivingAge,70);assert.equal(r.chosen.timeline.normalYears,5);assert.equal(r.chosen.lumpYears,5);assert.equal(r.paidYears,5);
});
