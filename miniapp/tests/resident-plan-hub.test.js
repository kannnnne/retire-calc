const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {audit}=require('../scripts/resident-ux-cases');
function page(patch={}){let def;const scrolls=[];const dir=path.join(__dirname,'../miniprogram/resident/pages/calc');vm.runInNewContext(fs.readFileSync(path.join(dir,'calc.js'),'utf8'),{Date,JSON,wx:{pageScrollTo(v){scrolls.push(v);}},Page:v=>def=v,require:id=>id.endsWith('/session')?{load(){},save(){}}:require(path.resolve(dir,id))});const q={...def,data:JSON.parse(JSON.stringify(def.data)),setData(patch){for(const[k,v]of Object.entries(patch)){const a=k.split('.');let t=this.data;for(const k of a.slice(0,-1))t=t[k];t[a[a.length-1]]=v;}}};q.setData({form:{...q.data.form,regionId:'450800',asOf:'2026-10',ageOnly:true,age:'59',years:'5',pastAnnual:'200',tier:200,paidThisYear:'yes',receiving:'no',...patch}});q.refreshPolicyQuestions();q.scrolls=scrolls;return q;}

test('统一调整展开保留原历史，未来换档即时重算，收起后仍可进补缴取消返回',()=>{
 const q=page();q.calculate();const original=JSON.parse(JSON.stringify(q.data.form));q.fold({currentTarget:{dataset:{key:'compare'}}});assert.equal(q.data.compare,true);q.chooseFuture({currentTarget:{dataset:{annual:1000}}});assert.equal(q.data.form.tier,1000);const after={...q.data.form,tier:original.tier};assert.deepEqual(after,original);assert.ok(q.data.display.monthly);q.openSupplementPlans();assert.equal(q.data.quickPlan.tier,1000);q.cancelMaxPlan();assert.equal(q.data.form.tier,1000);assert.equal(q.data.compare,true);assert.equal(q.data.form.pastAnnual,'200');
});

test('已加入的历史补漏／提档不随以后换档重写或重复收费',()=>{
 const q=page({ageOnly:false,birth:'1967-11',historyMode:'segments',segments:[{start:'2021',end:'2021',annual:'200'},{start:'2023',end:'2026',annual:'200'}]});q.calculate();q.openSupplementPlans();q.quickChoice({currentTarget:{dataset:{tier:1000}}});q.quickConfirm();q.applyMaxPlan();const records=JSON.stringify(q.data.form.gxMakeupRows),entries=JSON.stringify(q.data.result.makeup.entries),history=q.data.result.pastPaid;q.chooseFuture({currentTarget:{dataset:{annual:2000}}});assert.equal(JSON.stringify(q.data.form.gxMakeupRows),records);assert.equal(JSON.stringify(q.data.result.makeup.entries),entries);assert.equal(q.data.result.pastPaid,history);assert.equal(q.data.form.tier,2000);assert.equal(q.data.form.gxScopeReviewed,'yes');
});

test('未参保先给两个选择，年缴参考与窗口提问都不创建过去缴费或资格',()=>{
 const q=page();q.history({currentTarget:{dataset:{value:'never'}}});q.calculate();const before=JSON.stringify(q.data.form);q.openSupplementPlans();assert.equal(q.data.registrationPlan,true);assert.equal(q.data.planning,false);assert.equal(q.data.quickPlan,null);q.registrationAnnual();assert.equal(q.data.registrationPlan,false);assert.equal(q.data.compare,true);assert.ok(q.data.planOptions.length>0);assert.equal(JSON.stringify(q.data.form),before);
 q.openSupplementPlans();q.registrationQuestions();assert.equal(q.data.recordHelp,true);assert.equal(q.data.registrationPlan,false);assert.equal(q.data.form.years,'0');assert.equal(q.data.form.never,true);assert.deepEqual(q.data.form.gxMakeupRows,[]);assert.equal(q.data.form.gxScopeReviewed,'unknown');q.closeRecordHelp();assert.equal(JSON.stringify(q.data.form),before);
});

test('填写页未参保也走同一入口；返回、重新填写、换地区清注册面板',()=>{
 const q=page();q.history({currentTarget:{dataset:{value:'never'}}});q.openPlanEntry();assert.equal(q.data.registrationPlan,true);assert.equal(q.data.result,null);q.registrationAnnual();assert.ok(q.data.result,q.data.error);assert.equal(q.data.form.years,'0');q.openPlanEntry();q.closeRegistrationPlan();assert.ok(q.data.result);q.openPlanEntry();q.reset();assert.equal(q.data.registrationPlan,false);q.history({currentTarget:{dataset:{value:'never'}}});q.openPlanEntry();q.regionChoice({detail:{regionId:'440100'}});assert.equal(q.data.registrationPlan,false);
});

test('登记引导不能给已领取者、新参保者制造即时补足或批准',()=>{
 const q=page({never:true,years:'0',balance:'0',pastAnnual:'',paidThisYear:'no',receiving:'yes'});q.openPlanEntry();assert.equal(q.data.registrationPlan,false);assert.match(q.data.error,/已经领取/);assert.equal(q.data.form.gxScopeReviewed,'unknown');q.calculate();assert.equal(q.data.result,null);
});

test('GX仅一个结果调整入口，公共内容包含资助和缴费时间，非GX仍用原卡片',()=>{
 const dir=path.join(__dirname,'../miniprogram/resident/pages/calc'),w=fs.readFileSync(path.join(dir,'calc.wxml'),'utf8'),shared=fs.readFileSync(path.join(dir,'plan-choices.wxml'),'utf8');assert.ok(w.includes('调整缴费方案'));assert.ok(w.includes('只改以后每年交'));assert.ok(w.includes('补以前的漏缴或差额'));assert.ok(w.includes('region.rule!==\'GUANGXI_ORDINARY\''));assert.equal((w.match(/bindtap="openSupplementPlans"/g)||[]).length,1);assert.equal((w.match(/<include src="plan-choices.wxml"\/>/g)||[]).length,2);
 for(const token of ['bindtap="chooseFuture"','bindchange="payUntil"','bindchange="socialAidChoose"','bindtap="moreFutureOptions"','补缴方案不变，只选以后每年交多少'])assert.ok(shared.includes(token),token);
 assert.ok(w.includes('我还没参加，可以登记参保吗？'));assert.ok(w.includes('我这类情况有没有补缴办法？'));assert.ok(w.includes('wx:if="{{!form.never}}" class="primary" bindtap="recordsReady"'));
});

test('同19例全链路均可执行：未来修改不动过去，补缴未核不能加入，未参保有两条路',()=>{
 const r=audit();assert.equal(r.cases.length,19);assert.deepEqual(r.safetyFailures,[]);assert.ok(r.cases.every(c=>!c.runnerError));assert.equal(r.cases.filter(c=>c.preview).length,14);assert.equal(r.cases.filter(c=>c.reference).length,3);assert.equal(r.cases.find(c=>c.id==='G08').route.view,'参保与缴费选择');assert.equal(r.cases.find(c=>c.id==='G08').registration.questions.view,'查记录');assert.ok(r.cases.filter(c=>c.futureOnly).every(c=>c.futureOnly.historyUnchanged));
});


test('南宁47岁已交12年可连续比较，不强制跳页；主动查看结果才滚回顶部',()=>{
 const q=page({regionId:'450100',age:'47',years:'12',paidThisYear:'unknown'});q.calculate();q.fold({currentTarget:{dataset:{key:'compare'}}});q.scrolls.length=0;const past=q.data.form.pastAnnual;
 for(const [annual,monthly]of [[2000,'250'],[6000,'340'],[200,'210']]){q.chooseFuture({currentTarget:{dataset:{annual}}});assert.equal(q.data.display.monthly,monthly);assert.equal(q.data.compare,true);assert.equal(q.data.form.pastAnnual,past);assert.equal(q.scrolls.length,0);}
 q.scrollTop();assert.equal(q.scrolls.length,1);assert.equal(q.scrolls[0].scrollTop,0);
});


test('到龄已交满且无后续费用，展示已交够；仍需续交时不能误标',()=>{
 const done=page({regionId:'450100',age:'60',years:'15',paidThisYear:'yes'});done.calculate();assert.equal(done.data.display.noFurtherPayment,true);assert.equal(Number(done.data.result.chosen.total),0);
 const future=page({regionId:'450100',age:'59',years:'5',paidThisYear:'yes'});future.calculate();assert.equal(future.data.display.noFurtherPayment,false);
 done.reset();assert.equal(done.data.result,null);assert.equal(done.data.form.regionId,'450100');assert.equal(done.data.form.age,'55');
});
