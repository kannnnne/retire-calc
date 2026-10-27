const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {split}=require('../miniprogram/resident/utils/payment-breakdown'),reference=require('../miniprogram/resident/utils/gx-reference-plan'),{getRegion}=require('../miniprogram/resident/data/regions');
function page(patch={}){let def;const dir=path.join(__dirname,'../miniprogram/resident/pages/calc');vm.runInNewContext(fs.readFileSync(path.join(dir,'calc.js'),'utf8'),{Date,JSON,wx:{pageScrollTo(){}},Page:v=>def=v,require:id=>id.endsWith('/session')?{load(){},save(){}}:require(path.resolve(dir,id))});const q={...def,data:JSON.parse(JSON.stringify(def.data)),setData(patch){for(const[k,v]of Object.entries(patch)){const a=k.split('.');let t=this.data;for(const k of a.slice(0,-1))t=t[k];t[a[a.length-1]]=v;}}};q.setData({form:{...q.data.form,regionId:'450800',asOf:'2026-10',ageOnly:true,age:'59',years:'5',pastAnnual:'200',tier:200,paidThisYear:'yes',receiving:'no',...patch}});q.refreshPolicyQuestions();return q;}

test('进入延续所选年档，非六档预设也有选中卡；不会擅自变最高档',()=>{
 for(const tier of [200,500,1500,6000]){const q=page({tier});q.openSupplementPlans();assert.equal(q.data.quickPlan.tier,tier);assert.equal(q.data.quickPlan.futureTier,tier);assert.ok(q.data.quickPlan.options.some(x=>x.tier===tier));assert.equal(q.data.quickPlan.confirmed,false);}
 const q=page();q.openSupplementPlans();assert.equal(q.data.quickPlan.summary.total,'2000.00');assert.equal(q.data.quickPlan.summary.monthly,210);q.applyMaxPlan();assert.match(q.data.quickPlan.error,/核对/);assert.equal(q.data.form.gxScopeReviewed,'unknown');
});

test('满15年与可正常交够的年轻人不展示重复补足方式，临近60且两路有区别才显示',()=>{
 for(const [patch,enough,canChoose]of [[{years:'15',age:'60'},true,false],[{age:'35'},false,false],[{age:'17',years:'1'},false,false],[{age:'60'},false,false],[{years:'13',paidThisYear:'unknown'},false,true],[{},false,true]]){const q=page(patch);q.openSupplementPlans();assert.equal(q.data.quickPlan.enough,enough);assert.equal(q.data.quickPlan.canChooseTiming,canChoose);}
 const q=page({years:'15',age:'60'});q.openSupplementPlans();assert.equal(q.data.quickPlan.summary.added,0);assert.equal(q.data.quickPlan.summary.total,'0.00');assert.equal(q.data.quickPlan.draft.rows.length,0);
});

test('只改以后年缴不要求确认补缴，也不写推定历史或资格；满年限零费用同样保留事实',()=>{
 const q=page({age:'35'});q.calculate();q.openSupplementPlans();const original=JSON.parse(JSON.stringify(q.data.form));q.quickFuture({detail:{value:q.data.region.tiers.indexOf(1000)}});assert.equal(q.data.quickPlan.draft.rows.length,0);q.applyMaxPlan();assert.equal(q.data.quickPlan,null);assert.equal(q.data.form.tier,1000);assert.equal(q.data.form.historyMode,original.historyMode);assert.deepEqual(q.data.form.segments,original.segments);assert.equal(q.data.form.pastAnnual,original.pastAnnual);assert.equal(q.data.form.gxScopeReviewed,original.gxScopeReviewed);
 const paid=page({age:'60',years:'15'});paid.openSupplementPlans();paid.applyMaxPlan();assert.equal(paid.data.quickPlan,null);assert.equal(paid.data.form.historyMode,'simple');assert.equal(paid.data.form.gxScopeReviewed,'unknown');assert.equal(paid.data.result.chosen.total,'0.00');
});

test('今年未交高档方案拆52000旧费加6000本年，明年6000，账仍为64000',()=>{
 const q=page({paidThisYear:'no'});q.openSupplementPlans();q.quickChoice({currentTarget:{dataset:{tier:6000}}});const s=q.data.quickPlan.summary;assert.equal(s.immediate,'52000.00');assert.equal(s.currentCost,'6000.00');assert.equal(s.nowCost,'58000.00');assert.equal(s.laterCost,'6000.00');assert.equal(s.laterYears,1);assert.equal(s.laterFirstYear,2027);assert.equal(s.total,'64000.00');
 q.quickConfirm();q.applyMaxPlan();const b=q.data.paymentBreakdown;assert.equal(b.nowCost,'58000.00');assert.equal(b.laterYears,1);assert.equal(q.data.result.chosen.total,'64000.00');
});

test('本年已含不重复收本年正常款，未知则明确保留假设；普通年缴同样拆当前年份',()=>{
 const q=page();q.openSupplementPlans();q.quickChoice({currentTarget:{dataset:{tier:6000}}});assert.equal(q.data.quickPlan.summary.currentCost,'0.00');assert.equal(q.data.quickPlan.summary.nowCost,'58000.00');assert.equal(q.data.quickPlan.summary.laterCost,'6000.00');
 const unknown=page({paidThisYear:'unknown'});unknown.openSupplementPlans();assert.equal(unknown.data.quickPlan.config.currentAssumed,true);assert.equal(unknown.data.quickPlan.summary.currentCost,'0.00');
 const ordinary=page({paidThisYear:'no'});ordinary.calculate();assert.equal(ordinary.data.paymentBreakdown.currentCost,'200.00');assert.equal(ordinary.data.paymentBreakdown.laterCost,'1800.00');assert.equal(ordinary.data.paymentBreakdown.laterYears,9);assert.equal(ordinary.data.result.chosen.total,'2000.00');
});

test('参考比较及年末支出仍可对账，拆分不修改原日程',()=>{
 const f=page({pastAnnual:'333',paidThisYear:'no'}).data.form,r=reference.build(f,getRegion('450800')),s=r.options.find(x=>x.tier===6000);assert.equal(s.historyCost,'23000.00');assert.equal(s.currentCost,'6000.00');assert.equal(s.nowCost,'29000.00');assert.equal(s.laterCost,'6000.00');assert.equal(s.total,'35000.00');
 const plan={annual:500,immediateCost:'100.20',schedule:[{year:2026,type:'正常年缴',years:1,cost:'500.10'},{year:2027,type:'正常年缴',years:1,cost:'500.20'}]},old=JSON.stringify(plan),dec=split(plan,'2026-12'),jan=split(plan,'2027-01');assert.equal(dec.nowCost,'600.30');assert.equal(dec.laterCost,'500.20');assert.equal(jan.nowCost,'600.40');assert.equal(jan.laterYears,0);assert.equal(JSON.stringify(plan),old);
});

test('模板区分参考与核对后加入，只有非空补缴记录展示确认；本年和以后各自渲染',()=>{
 const w=fs.readFileSync(path.join(__dirname,'../miniprogram/resident/pages/calc/calc.wxml'),'utf8');for(const text of ['quickPlan.canChooseTiming','年数已够','不用再补年数','核对后加入方案','使用这个缴费档次','今年正常交','summary.laterYears','paymentBreakdown.currentCost'])assert.ok(w.includes(text),text);assert.ok(w.includes('wx:if="{{quickPlan.draft.rows.length}}"'));
});

test('旧会话打开的方案补齐新费用字段，保留选档及单年调整，不沿用旧确认',()=>{
 const q=page({paidThisYear:'no'});q.openSupplementPlans();q.quickChoice({currentTarget:{dataset:{tier:6000}}});const before=q.data.quickPlan.summary.total;delete q.data.quickPlan.canChooseTiming;delete q.data.quickPlan.enough;delete q.data.quickPlan.summary.nowCost;q.quickConfirm();q.restorePlanPresentation();assert.equal(q.data.quickPlan.summary.nowCost,'58000.00');assert.equal(q.data.quickPlan.summary.total,before);assert.equal(q.data.quickPlan.tier,6000);assert.equal(q.data.quickPlan.confirmed,false);
 const avg=page({pastAnnual:'333'});avg.openSupplementPlans();avg.chooseReference({currentTarget:{dataset:{tier:1000}}});delete avg.data.referencePlan.selected.nowCost;avg.restorePlanPresentation();assert.equal(avg.data.referencePlan.tier,1000);assert.equal(avg.data.referencePlan.selected.nowCost,'9000.00');assert.equal(avg.data.form.gxScopeReviewed,'unknown');
});
