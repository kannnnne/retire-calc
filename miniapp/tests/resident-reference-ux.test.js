const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const reference=require('../miniprogram/resident/utils/gx-reference-plan'),max=require('../miniprogram/resident/utils/gx-max-plan'),{getRegion}=require('../miniprogram/resident/data/regions');
const policy=getRegion('450800'),base=patch=>({regionId:'450800',asOf:'2026-10',ageOnly:true,age:'59',birth:'',years:'5',pastAnnual:'333',paidThisYear:'yes',receiving:'no',never:false,accountMode:'estimate',historyMode:'simple',tier:200,balance:'',eligible:'unknown',ordinary:'unknown',gxScopeReviewed:'unknown',gxMakeupRows:[],gxTransitionEnabled:'no',...patch});
function page(){let def;const dir=path.join(__dirname,'../miniprogram/resident/pages/calc');vm.runInNewContext(fs.readFileSync(path.join(dir,'calc.js'),'utf8'),{Date,JSON,wx:{pageScrollTo(){}},Page:v=>def=v,require:id=>id.endsWith('/session')?{load(){},save(){}}:require(path.resolve(dir,id))});return {...def,data:JSON.parse(JSON.stringify(def.data)),setData(patch){for(const[k,v]of Object.entries(patch)){const a=k.split('.');let t=this.data;for(const k of a.slice(0,-1))t=t[k];t[a[a.length-1]]=v;}}};}

test('平均333保留1665本金，补漏不提档，六档真实费用且不导出可应用表单',()=>{
 const f=base(),old=JSON.stringify(f),r=reference.build(f,policy);assert.equal(r.opening,'1665.00');assert.equal(r.referenceOnly,true);assert.equal(r.options.length,6);assert.equal(r.form,undefined);assert.equal(r.rows,undefined);assert.equal(JSON.stringify(f),old);
 const low=r.options[0],high=r.options[r.options.length-1];assert.equal(low.immediate,'1800.00');assert.equal(low.total,'2000.00');assert.equal(low.monthly,210);assert.equal(high.immediate,'29000.00');assert.equal(high.total,'35000.00');assert.equal(high.monthly,Math.round((186+(1665+29000+6000+200)/139)/10)*10);assert.equal(high.receipt,'2027-11');assert.ok(r.options.every(x=>x.upgraded===0));assert.match(r.reason,/不算提高旧档/);
 assert.throws(()=>max.build({...f,birth:'1967-10'},policy),/原缴费档次/);
});

test('月记16.67只按12月估账户，不凑成合法年度原档，余额模式不重复加本金',()=>{
 const monthly=reference.build(base({pastMonthly:true,pastAnnual:'16.67'}),policy);assert.equal(monthly.opening,'1000.20');assert.match(monthly.assumption,/200.04/);assert.equal(monthly.options[0].total,'2000.00');
 const balance=reference.build(base({accountMode:'balance',balance:'5000'}),policy);assert.equal(balance.opening,'5000.00');assert.match(balance.assumption,/账户5000.00/);assert.equal(balance.options[0].monthly,Math.round((186+(5000+1800+200+35)/139)/10)*10);
});

test('三四年三四百的用户先看3年300的明确假设，不需要先查窗口',()=>{
 const f=base({age:'60',historyUncertain:true,roughYearsMin:'3',roughYearsMax:'4',roughAnnualMin:'300',roughAnnualMax:'400',paidThisYear:'unknown'}),old=JSON.stringify(f),r=reference.build(f,policy);assert.match(r.assumption,/3年、每年300/);assert.match(r.assumption,/今年先按已含/);assert.equal(r.opening,'900.00');assert.equal(r.options[0].added,12);assert.equal(r.options[0].total,'2400.00');assert.equal(r.options[0].monthly,210);assert.equal(JSON.stringify(f),old);
 for(const patch of [{roughYearsMax:'56'},{roughYearsMin:'3.5'},{roughYearsMax:'14'},{roughAnnualMax:'200'},{roughAnnualMax:'100001'}])assert.throws(()=>reference.build({...f,...patch},policy));
});

test('当前未交不重复补本年，未来年缴与旧年无补贴费用分开；无可补历史时不编年份',()=>{
 const r=reference.build(base({paidThisYear:'no'}),policy),high=r.options[r.options.length-1];assert.equal(high.added,8);assert.equal(high.normalYears,2);assert.equal(high.immediate,'23000.00');assert.equal(high.total,'35000.00');assert.equal(high.future,'12000.00');
 const young=reference.build(base({age:'17',years:'1'}),policy);assert.ok(young.options.every(x=>x.added===0&&x.immediate==='0.00'));assert.match(young.note,/只比较以后/);
});

test('不为新参保／已领取／其他省／原核定方案制造补缴资格',()=>{
 for(const patch of [{never:true,years:'0'},{receiving:'yes'},{approvedPlan:{}},{gxTransitionEnabled:'yes'},{gxMakeupRows:[{mode:'missing'}]},{historyMode:'segments'}])assert.throws(()=>reference.build(base(patch),policy));
 assert.throws(()=>reference.build(base(),getRegion('440100')));
});

test('参考页选档、退出、查记录、换地区都不写原记录和确认，原结果不丢失',()=>{
 const q=page();q.setData({form:{...q.data.form,...base()}});q.refreshPolicyQuestions();q.calculate();const original=JSON.stringify(q.data.form),result=JSON.stringify(q.data.result);q.openSupplementPlans();assert.equal(q.data.referencePlan.referenceOnly,true);assert.equal(q.data.recordHelp,false);q.chooseReference({currentTarget:{dataset:{tier:1000}}});assert.equal(q.data.referencePlan.selected.total,'10000.00');q.applyMaxPlan();assert.equal(JSON.stringify(q.data.form),original);q.closeReferencePlan();assert.equal(JSON.stringify(q.data.result),result);
 q.openSupplementPlans();q.referenceRecords();assert.equal(q.data.referencePlan,null);assert.equal(q.data.planning,true);q.cancelPaymentPlanner();assert.equal(JSON.stringify(q.data.result),result);q.openSupplementPlans();q.regionChoice({detail:{regionId:'440100'}});assert.equal(q.data.referencePlan,null);
});

test('粗记用户可以比较和返回，核对按钮才去查记录，未查数据不被改为真实',()=>{
 const q=page();q.setData({form:{...q.data.form,...base({age:'60',historyUncertain:true,roughYearsMin:'3',roughYearsMax:'4',roughAnnualMin:'300',roughAnnualMax:'400',paidThisYear:'unknown'})}});q.refreshPolicyQuestions();q.calculate();const original=JSON.stringify(q.data.form);q.openSupplementPlans();assert.ok(q.data.referencePlan);assert.equal(q.data.recordHelp,false);q.chooseReference({currentTarget:{dataset:{tier:500}}});assert.equal(q.data.referencePlan.selected.monthly,240);q.referenceRecords();assert.equal(q.data.recordHelp,true);assert.equal(q.data.referencePlan,null);assert.equal(JSON.stringify(q.data.form),original);assert.equal(q.data.form.gxScopeReviewed,'unknown');
});

test('主结果单独说明逐年路线，补缴入口贴着缴费安排；参考页无应用或资格勾选按钮',()=>{
 const w=fs.readFileSync(path.join(__dirname,'../miniprogram/resident/pages/calc/calc.wxml'),'utf8'),start=w.indexOf('<block wx:elif="{{referencePlan}}">'),end=w.indexOf('<block wx:elif="{{quickPlan}}">');const ref=w.slice(start,end);assert.ok(ref.includes('补缴参考 ⓘ'));assert.ok(ref.includes('bindtap="resultInfo"'));assert.equal(ref.includes('bindtap="applyMaxPlan"'),false);assert.equal(ref.includes('quickConfirm'),false);assert.ok(w.includes('只往后每年交的结果'));assert.ok(w.indexOf('bindtap="openSupplementPlans"')>w.indexOf('payment-card'));assert.ok(w.indexOf('bindtap="openSupplementPlans"')<w.indexOf('submit-dock result-dock'));
});
