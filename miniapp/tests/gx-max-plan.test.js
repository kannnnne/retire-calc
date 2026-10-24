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

test('只知5年每年200时自动推定最近5年，一键生成并标记参考假设',()=>{
 const f=form({historyMode:'simple',segments:[]}),s=max.setup(f,p);assert.equal(s.complete,false);assert.deepEqual(s.selected,[2026,2025,2024,2023,2022]);assert.equal(s.inferred,true);assert.equal(result(max.build(f,p)).chosen.total,'64000.00');
 const d=max.build(f,p,{selected:[2021,2023,2024,2025,2026],annual:'200'});assert.equal(result(d).chosen.total,'64000.00');assert.equal(d.form.segments.length,2);assert.equal(d.form.segments[1].end,'2026');
 assert.throws(()=>max.build(f,p,{selected:[2021,2022,2023,2024,2025],annual:'200'}),/已匹配/);
});

test('不同旧年金额与已最高档原样保留；余额模式不把原缴费再次加入账户',()=>{
 const f=form({segments:[{start:'2021',end:'2021',annual:'500'},{start:'2023',end:'2026',annual:'6000'}]}),d=max.build(f,p),r=result(d);assert.equal(d.upgradedYears,1);assert.equal(d.rows.find(x=>x.mode==='upgrade').original,500);assert.equal(r.makeup.cost,'34500.00');assert.equal(r.pastPaid,'24500.00');
 const balance=max.build(form({accountMode:'balance',balance:'3000'}),p);assert.equal(result(balance).openingAmount,'3000.00');assert.equal(result(balance).chosen.account,'67365.00');
});

test('不越过领取状态、模糊记录、原有特殊方案及真实可用年份边界',()=>{
 for(const patch of [{receiving:'yes'},{never:true},{years:'0'},{historyUncertain:true},{approvedPlan:{}},{gxTransitionEnabled:'yes'},{segments:[{start:'2021',end:'2021',annual:'360'}]},{gxStartYear:'2021'}])assert.throws(()=>max.build(form(patch),p));
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
 const q=page();q.setData({form:{...q.data.form,...form({historyMode:'simple',segments:[]})}});q.refreshPolicyQuestions();q.calculate();const old=JSON.stringify(q.data.form);q.openMaxPlan();assert.equal(q.data.quickPlan.annual,'200');assert.equal(q.data.quickPlan.summary.monthly,660);assert.equal(q.data.quickPlan.editYears,false);q.quickEditYears();for(const y of [...q.data.quickPlan.selected])q.quickYear({currentTarget:{dataset:{year:y}}});
 for(const y of [2021,2023,2024,2025,2026])q.quickYear({currentTarget:{dataset:{year:y}}});q.quickGenerate();assert.equal(q.data.quickPlan.summary.monthly,660);assert.equal(q.data.quickPlan.confirmed,false);
 q.quickConfirm();q.data.quickPlan.draft.form.birth='bad';q.applyMaxPlan();assert.equal(JSON.stringify(q.data.form),old);assert.ok(q.data.quickPlan.error);assert.equal(q.data.result.chosen.timeline.receivingAge,69);
 const w=fs.readFileSync(path.join(__dirname,'../miniprogram/resident/pages/calc/calc.wxml'),'utf8');assert.match(w,/bindtap="quickYear"/);assert.match(w,/confirm-type="done" bindconfirm="quickGenerate"/);assert.match(w,/先选每月领多少/);assert.match(w,/尚未领养老金/);
});

test('只有出生年月或年龄与年数也直接生成，未知本年状态显式默认已含，原表单不改',()=>{
 const f=form({historyMode:'simple',segments:[],paidThisYear:'unknown'}),snapshot=JSON.stringify(f),config=max.setup(f,p);assert.equal(config.currentAssumed,true);assert.equal(config.paidThisYear,'yes');assert.equal(config.selected.length,5);assert.equal(result(max.build(f,p)).chosen.total,'64000.00');assert.equal(JSON.stringify(f),snapshot);
 const q=page();q.setData({form:{...q.data.form,...f}});q.refreshPolicyQuestions();q.openMaxPlan();assert.equal(q.data.quickPlan.summary.monthly,660);assert.equal(q.data.quickPlan.summary.currentAssumed,true);assert.equal(q.data.quickPlan.editYears,false);assert.equal(q.data.form.paidThisYear,'unknown');assert.equal(q.data.form.historyMode,'simple');
 q.quickMode({currentTarget:{dataset:{mode:'NOW'}}});assert.equal(q.data.quickPlan.summary.total,'59000.00');q.quickEditYears();q.quickPaid({currentTarget:{dataset:{value:'no'}}});assert.match(q.data.quickPlan.error,/可用漏缴年份不足/);q.quickMode({currentTarget:{dataset:{mode:'TO_SIXTY'}}});assert.ok(q.data.quickPlan.summary,q.data.quickPlan.error);assert.equal(q.data.quickPlan.config.selected.includes(2026),false);assert.equal(q.data.form.paidThisYear,'unknown');
 const age=form({historyMode:'simple',segments:[],ageOnly:true,age:'59',birth:''});assert.equal(result(max.build(age,p)).chosen.timeline.finalYears,15);
});

test('已知部分历史优先保留，不用最近年覆盖；没有年缴金额时按最低200明确参考',()=>{
 const f=form({historyMode:'simple',segments:[],gxMakeupRows:[{mode:'upgrade',start:'2021',end:'2021',original:200,target:6000}]}),config=max.setup(f,p);assert.ok(config.selected.includes(2021));assert.equal(config.selected.length,5);const d=max.build(f,p);assert.ok(d.form.segments.some(s=>Number(s.start)<=2021&&Number(s.end)>=2021));assert.equal(d.inferred,true);
 const empty=form({historyMode:'simple',segments:[],pastAnnual:''});assert.equal(max.setup(empty,p).amountAssumed,true);assert.equal(max.setup(empty,p).annual,'200');assert.equal(result(max.build(empty,p)).pastPaid,'1000.00');
});

test('从手填补缴页直接一键得到金额，无年份点击、确认不自动勾选且取消返回手填',()=>{
 const q=page();q.setData({form:{...q.data.form,...form({historyMode:'simple',segments:[]})}});q.refreshPolicyQuestions();q.calculate();q.openPaymentPlanner();assert.equal(q.data.planning,true);q.openMaxPlan();assert.equal(q.data.quickPlan.summary.monthly,660);assert.equal(q.data.quickPlan.confirmed,false);q.cancelMaxPlan();assert.equal(q.data.planning,true);assert.equal(q.data.form.gxMakeupRows.length,0);
 q.openMaxPlan();q.quickConfirm();q.applyMaxPlan();assert.equal(q.data.quickPlan,null);assert.equal(q.data.planning,false);assert.equal(q.data.result.chosen.total,'64000.00');
 const w=fs.readFileSync(path.join(__dirname,'../miniprogram/resident/pages/calc/calc.wxml'),'utf8');assert.match(w,/先选每月领多少/);assert.match(w,/!quickPlan.config.complete && quickPlan.editYears/);assert.match(w,/参考假设，不是查询记录/);
});

test('低中高档真实反算，各旧年封顶，已缴本金固定而不是按卡片写死月额',()=>{
 const f=form();for(const [tier,total]of [[200,'2000.00'],[500,'6500.00'],[1000,'14000.00'],[2000,'28000.00'],[3000,'37000.00'],[6000,'64000.00']]){const d=max.build(f,p,{tier}),r=result(d);assert.equal(r.chosen.total,total);assert.equal(r.pastPaid,'1000.00');assert.equal(r.chosen.timeline.finalYears,15);assert.equal(r.chosen.receiptMonth,'2027-12');for(const entry of r.makeup.entries){assert.ok(require('../miniprogram/resident/utils/gx-makeup').tiersForYear(entry.year).includes(Number(entry.target)));}assert.equal(JSON.stringify(f),JSON.stringify(form()));}
 const low=result(max.build(f,p,{tier:200}));assert.equal(low.makeup.cost,'1800.00');assert.equal(Math.round(Number(low.chosen.low)/10)*10,210);
});

test('低档方案不降低过去较高缴费，单年保留原档可撤销提差但不能减少本金',()=>{
 const high=form({segments:[{start:'2021',end:'2021',annual:'2000'},{start:'2023',end:'2026',annual:'6000'}]});const d=max.build(high,p,{tier:200}),r=result(d);assert.equal(d.upgradedYears,0);assert.equal(r.pastPaid,'26000.00');assert.equal(r.makeup.cost,'1800.00');
 const edit=max.build(form(),p,{targets:{2021:200,2013:500},futureTier:1000}),changed=result(edit);assert.equal(changed.makeup.cost,'51700.00');assert.equal(edit.upgradedYears,4);assert.equal(changed.chosen.annual,1000);assert.equal(changed.pastPaid,'1000.00');assert.equal(changed.chosen.total,'52700.00');
 for(const patch of [{targets:{2013:6000}},{targets:{2021:100}},{targets:{2030:200}},{tier:123},{futureTier:123}])assert.throws(()=>max.build(form(),p,patch));
});

test('页面先给六种月领选择，选择中档立刻显示其费用，确认与原数据保持隔离',()=>{
 const q=page();q.setData({form:{...q.data.form,...form()}});q.refreshPolicyQuestions();q.calculate();const old=JSON.stringify(q.data.form);q.openMaxPlan();assert.deepEqual(Array.from(q.data.quickPlan.options,x=>x.tier),[200,500,1000,2000,3000,6000]);
 for(const option of q.data.quickPlan.options){const r=result(max.build(form(),p,{tier:option.tier}));assert.equal(option.monthly,Math.round(Number(r.chosen.low)/10)*10);assert.equal(option.total,r.chosen.total);}
 q.quickConfirm();q.quickChoice({currentTarget:{dataset:{tier:2000}}});assert.equal(q.data.quickPlan.summary.total,'28000.00');assert.equal(q.data.quickPlan.summary.missingCost,'17000.00');assert.equal(q.data.quickPlan.summary.upgradeCost,'9000.00');assert.equal(q.data.quickPlan.confirmed,false);assert.equal(JSON.stringify(q.data.form),old);
 q.quickConfirm();q.applyMaxPlan();assert.equal(q.data.result.chosen.total,'28000.00');assert.equal(q.data.form.tier,2000);assert.equal(q.data.quickPlan,null);
});

test('选金额后改未来年缴与单年补缴，上方实时重算；重新选预设恢复整套方案',()=>{
 const q=page();q.setData({form:{...q.data.form,...form()}});q.refreshPolicyQuestions();q.openMaxPlan();q.quickDetails();q.quickConfirm();q.quickFuture({detail:{value:p.tiers.indexOf(1000)}});assert.equal(q.data.quickPlan.summary.total,'59000.00');assert.equal(q.data.quickPlan.confirmed,false);assert.equal(q.data.quickPlan.custom,true);
 const row=q.data.quickPlan.draft.editable.find(x=>x.year===2021),before=q.data.quickPlan.summary.monthly;q.quickTarget({currentTarget:{dataset:{year:2021}},detail:{value:row.allowed.indexOf(200)}});assert.equal(q.data.quickPlan.summary.total,'53200.00');assert.ok(q.data.quickPlan.summary.monthly<before);assert.equal(q.data.quickPlan.draft.editable.find(x=>x.year===2021).target,200);
 q.quickChoice({currentTarget:{dataset:{tier:6000}}});assert.equal(q.data.quickPlan.summary.total,'64000.00');assert.equal(q.data.quickPlan.custom,false);assert.deepEqual(Object.keys(q.data.quickPlan.targets),[]);
});

test('自己输入非预设合法档可算，非法档不应用；输入过程中不移除编辑控件',()=>{
 const q=page();q.setData({form:{...q.data.form,...form()}});q.refreshPolicyQuestions();q.openMaxPlan();q.quickDetails();q.quickTierInput({detail:{value:'1500'}});assert.ok(q.data.quickPlan.summary);assert.ok(q.data.quickPlan.draft.editable.length);assert.equal(q.data.quickPlan.dirty,true);q.quickRefresh();assert.equal(q.data.quickPlan.tier,1500);assert.equal(q.data.quickPlan.dirty,false);assert.equal(q.data.quickPlan.summary.total,result(max.build(form(),p,{tier:1500})).chosen.total);
 q.quickTierInput({detail:{value:'123'}});q.quickTierSubmit();assert.match(q.data.quickPlan.error,/允许的年缴档次/);q.quickConfirm();q.applyMaxPlan();assert.match(q.data.quickPlan.error,/点击更新/);assert.equal(q.data.form.gxScopeReviewed,'unknown');
 q.quickFuture({detail:{value:0}});assert.equal(q.data.quickPlan.dirty,true);assert.match(q.data.quickPlan.error,/允许的年缴档次/);
});

test('切补足方式重算选项和时间，不把未来年费留在现在补满路线；取消不覆盖结果',()=>{
 const q=page();q.setData({form:{...q.data.form,...form()}});q.refreshPolicyQuestions();q.calculate();const old=JSON.stringify(q.data.result);q.openMaxPlan();q.quickChoice({currentTarget:{dataset:{tier:1000}}});q.quickMode({currentTarget:{dataset:{mode:'NOW'}}});assert.equal(q.data.quickPlan.summary.normalYears,0);assert.equal(q.data.quickPlan.summary.total,'14000.00');assert.equal(q.data.quickPlan.options.find(x=>x.tier===6000).total,'59000.00');q.cancelMaxPlan();assert.equal(JSON.stringify(q.data.result),old);
 const w=fs.readFileSync(path.join(__dirname,'../miniprogram/resident/pages/calc/calc.wxml'),'utf8');assert.ok(w.indexOf('quickPlan.options')<w.indexOf('按这份方案，每月约领'));for(const event of ['quickChoice','quickFuture','quickTarget','quickTierSubmit'])assert.ok(w.includes(event));assert.ok(w.includes('自己调整怎么交'));
});