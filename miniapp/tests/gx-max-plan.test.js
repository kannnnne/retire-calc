const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const max=require('../miniprogram/resident/utils/gx-max-plan'),{calculate}=require('../miniprogram/resident/utils/calculate'),{getRegion}=require('../miniprogram/resident/data/regions');
const p=getRegion('450800');
const form=patch=>({regionId:'450800',birth:'1967-11',asOf:'2026-10',ageOnly:false,years:'5',pastAnnual:'200',accountMode:'estimate',historyMode:'segments',segments:[{start:'2021',end:'2021',annual:'200'},{start:'2023',end:'2026',annual:'200'}],never:false,receiving:'no',paidThisYear:'yes',tier:6000,gxStartYear:'2012',eligible:'yes',ordinary:'yes',gxScopeReviewed:'unknown',gxTransitionEnabled:'no',...patch});
const result=d=>calculate({...d.form,gxScopeReviewed:'yes'});
function page(store={}){let config;const base=path.join(__dirname,'../miniprogram/resident/pages/calc');vm.runInNewContext(fs.readFileSync(path.join(base,'calc.js'),'utf8'),{Date,JSON,wx:{pageScrollTo(){}},Page:x=>config=x,require:x=>x.endsWith('/session')?{load:k=>store[k],save:(k,v)=>{store[k]=JSON.parse(JSON.stringify(v));}}:require(path.resolve(base,x))});return {...config,data:JSON.parse(JSON.stringify(config.data)),setData(patch){for(const[k,v]of Object.entries(patch)){let t=this.data;const a=k.split('.');for(const v of a.slice(0,-1))t=t[v];t[a.at(-1)]=v;}}};}

test('一键配好到60岁15年：漏9年、提高5年、58000加2027年6000，约660',()=>{
 const f=form(),old=JSON.stringify(f),d=max.build(f,p);assert.equal(d.addedYears,9);assert.equal(d.upgradedYears,5);assert.equal(d.form.gxScopeReviewed,'unknown');assert.equal(d.subsidyReference,true);assert.equal(d.subsidyUsed,35);
 const r=result(d);assert.equal(r.makeup.cost,'58000.00');assert.equal(r.chosen.total,'64000.00');assert.equal(r.chosen.low,'656.25');assert.equal(r.chosen.receiptMonth,'2027-12');assert.equal(r.chosen.timeline.finalYears,15);assert.equal(r.chosen.timeline.normalYears,1);assert.equal(JSON.stringify(f),old);
});

test('现在补够15年准确复现59000与620，旧年不一律6000、旧本金不再收费',()=>{
 const d=max.build(form(),p,{mode:'NOW'}),r=result(d);assert.equal(d.addedYears,10);assert.equal(d.upgradedYears,5);assert.equal(r.makeup.cost,'59000.00');assert.equal(r.chosen.total,'59000.00');assert.equal(r.chosen.low,(186+(1000+59000+165)/139).toFixed(2));assert.equal(r.chosen.timeline.normalYears,0);assert.equal(r.chosen.timeline.finalYears,15);assert.equal(r.pastPaid,'1000.00');
 assert.equal(r.makeup.entries.find(e=>e.year===2012).target,'1000.00');assert.equal(r.makeup.entries.find(e=>e.year===2018).target,'2000.00');assert.equal(r.makeup.entries.find(e=>e.year===2021).cost,'5800.00');
});

test('已有手填提档也可直接识别完整5年；原补贴沿用，查询到35时可一次改正',()=>{
 const f=form({historyMode:'simple',segments:[],gxMakeupRows:[{mode:'upgrade',start:'2021',end:'2021',original:200,target:6000},{mode:'upgrade',start:'2023',end:'2026',original:200,target:6000,subsidyAlready:200}]});
 assert.equal(max.setup(f,p).complete,true);const d=max.build(f,p,{mode:'NOW'});assert.equal(d.subsidyUsed,200);assert.equal(d.subsidyReference,false);assert.equal(result(d).chosen.low,(186+60000/139).toFixed(2));
 assert.equal(result(max.build(f,p,{mode:'NOW',currentSubsidy:'35'})).chosen.low,(186+(60000+165)/139).toFixed(2));
});

test('只知5年每年200时不猜是哪5年，点选已交年份后自动生成全部补漏及提档',()=>{
 const f=form({historyMode:'simple',segments:[]}),s=max.setup(f,p);assert.equal(s.complete,false);assert.deepEqual(s.selected,[]);assert.throws(()=>max.build(f,p),/点齐/);
 const d=max.build(f,p,{selected:[2021,2023,2024,2025,2026],annual:'200'});assert.equal(result(d).chosen.total,'64000.00');assert.equal(d.form.segments.length,2);assert.equal(d.form.segments[1].end,'2026');
 assert.throws(()=>max.build(f,p,{selected:[2021,2022,2023,2024,2025],annual:'200'}),/点齐/);
});

test('不同旧年金额与已最高档原样保留；余额模式不把原缴费再次加入账户',()=>{
 const f=form({segments:[{start:'2021',end:'2021',annual:'500'},{start:'2023',end:'2026',annual:'6000'}]}),d=max.build(f,p),r=result(d);assert.equal(d.upgradedYears,1);assert.equal(d.rows.find(x=>x.mode==='upgrade').original,500);assert.equal(r.makeup.cost,'34500.00');assert.equal(r.pastPaid,'24500.00');
 const balance=max.build(form({accountMode:'balance',balance:'3000'}),p);assert.equal(result(balance).openingAmount,'3000.00');assert.equal(result(balance).chosen.account,'67365.00');
});

test('不越过领取状态、模糊记录、原有特殊方案及真实可用年份边界',()=>{
 for(const patch of [{receiving:'yes'},{never:true},{years:'0'},{historyUncertain:true},{paidThisYear:'unknown'},{approvedPlan:{}},{gxTransitionEnabled:'yes'},{segments:[{start:'2021',end:'2021',annual:'360'}]},{gxStartYear:'2021'}])assert.throws(()=>max.build(form(patch),p));
 assert.throws(()=>max.build(form(),getRegion('440100')),/广西/);assert.throws(()=>max.build(form(),p,{mode:'wrong'}),/请选择/);
 const f=form({historyMode:'simple',segments:[],gxMakeupRows:[{mode:'upgrade',start:'2021',end:'2021',original:200,target:6000}]});assert.throws(()=>max.build(f,p,{selected:[2022,2023,2024,2025,2026],annual:'200'}),/不能.*删除/);
});

test('真实页面预览不改变旧方案，模式及补贴可改，核对后一次应用、恢复和切省',()=>{
 const store={},q=page(store);q.setData({form:{...q.data.form,...form()}});q.refreshPolicyQuestions();q.calculate();const old=JSON.stringify(q.data.form),age=q.data.result.chosen.timeline.receivingAge;
 q.openMaxPlan();assert.equal(q.data.quickPlan.summary.monthly,660);assert.equal(JSON.stringify(q.data.form),old);assert.equal(q.data.result.chosen.timeline.receivingAge,age);q.applyMaxPlan();assert.match(q.data.quickPlan.error,/核对/);assert.equal(JSON.stringify(q.data.form),old);
 q.quickMode({currentTarget:{dataset:{mode:'NOW'}}});assert.equal(q.data.quickPlan.summary.total,'59000.00');q.quickSubsidy({detail:{value:'0'}});assert.equal(q.data.quickPlan.summary,null);assert.equal(q.data.quickPlan.subsidyInputVisible,true);q.quickGenerate();assert.equal(q.data.quickPlan.summary.subsidyUsed,0);
 q.quickConfirm();q.applyMaxPlan();assert.equal(q.data.quickPlan,null);assert.equal(q.data.result.chosen.timeline.normalYears,0);assert.equal(q.data.result.chosen.total,'59000.00');assert.equal(q.data.display.monthly,'620');
 q.onHide();const next=page(store);next.onLoad();assert.equal(next.data.result.chosen.total,'59000.00');next.openMaxPlan();next.cancelMaxPlan();assert.equal(next.data.result.chosen.total,'59000.00');next.openMaxPlan();next.regionChoice({detail:{regionId:'440100'}});assert.equal(next.data.quickPlan,null);assert.equal(next.data.form.gxMakeupRows.length,0);
});

test('点年份不用键盘、原年缴额复用、应用失败回到原输入，确认不会由快捷预览自动勾上',()=>{
 const q=page();q.setData({form:{...q.data.form,...form({historyMode:'simple',segments:[]})}});q.refreshPolicyQuestions();q.calculate();const old=JSON.stringify(q.data.form);q.openMaxPlan();assert.equal(q.data.quickPlan.annual,'200');assert.equal(q.data.quickPlan.summary,null);
 for(const y of [2021,2023,2024,2025,2026])q.quickYear({currentTarget:{dataset:{year:y}}});q.quickGenerate();assert.equal(q.data.quickPlan.summary.monthly,660);assert.equal(q.data.quickPlan.confirmed,false);
 q.quickConfirm();q.data.quickPlan.draft.form.birth='bad';q.applyMaxPlan();assert.equal(JSON.stringify(q.data.form),old);assert.ok(q.data.quickPlan.error);assert.equal(q.data.result.chosen.timeline.receivingAge,69);
 const w=fs.readFileSync(path.join(__dirname,'../miniprogram/resident/pages/calc/calc.wxml'),'utf8');assert.match(w,/bindtap="quickYear"/);assert.match(w,/confirm-type="done" bindconfirm="quickGenerate"/);assert.match(w,/最高档，一键配好/);assert.match(w,/尚未领养老金/);
});
