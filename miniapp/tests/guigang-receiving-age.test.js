const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const form=(patch={})=>({regionId:'450800',birth:'1967-10',asOf:'2026-10',years:'5',balance:'',pastAnnual:'360',tier:200,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',...patch});

test('用户贵港59岁已交5年今年已含：只按以后逐年交时再交10年至69岁，不是地方退休年龄',()=>{
 const r=calculate(form()),s=r.chosen;
 assert.equal(r.age,59);assert.equal(r.missing,10);assert.equal(s.timeline.normalYears,10);
 assert.equal(s.timeline.firstYear,2027);assert.equal(s.timeline.lastYear,2036);
 assert.equal(s.timeline.receivingAge,69);assert.equal(s.receiptYear,2036);
 assert.equal(s.total,'2000.00');assert.equal(s.lumpYears,0);assert.equal(s.subsidy,'350.00');
 assert.deepEqual(s.schedule.map(x=>x.year),Array.from({length:10},(_,i)=>2027+i));
});

test('同一人若经办允许补2012至2021十个断缴年度，可在满60后起领；不自动赋予可补权限',()=>{
 const rows=[{mode:'missing',start:'2012',end:'2021',target:200}];
 const f=form({historyMode:'segments',segments:[{start:'2022',end:'2026',annual:'360'}],gxStartYear:'2012',gxMakeupRows:rows,gxScopeReviewed:'yes'});
 const r=calculate(f),s=r.chosen;
 assert.equal(r.makeup.addedYears,10);assert.equal(r.makeup.cost,'2000.00');assert.equal(r.makeup.subsidy,'0.00');
 assert.equal(s.timeline.normalYears,0);assert.equal(s.lumpYears,0);assert.equal(s.timeline.finalYears,15);
 assert.equal(s.timeline.receivingAge,60);assert.equal(s.receiptYear,2027);assert.equal(s.account,'3800.00');
 assert.equal(s.low,(186+3800/139).toFixed(2));
 assert.throws(()=>calculate({...f,gxScopeReviewed:'unknown'}),/先确认/);
 assert.throws(()=>calculate({...f,gxStartYear:''}),/可补起始年度/);
});

test('桂平2012建制不等于所有当前59岁者能直接按老参保人补足',()=>{
 // 1967-10出生者在2012-01未满45岁，且只交5年并不满足逐年缴至60记录。
 assert.throws(()=>calculate(form({birth:'1967-10',asOf:'2027-10',gxTransitionEnabled:'yes',gxTransitionStart:'2012-01',gxTransitionYears:'10',gxTransitionReviewed:'yes'})),/距60岁不足15年/);
});

test('贵港结果可返回核对补缴，保留原输入，不自动填可补起点或勾资格',()=>{
 let def;const base=path.join(__dirname,'../miniprogram/resident/pages/calc');
 vm.runInNewContext(fs.readFileSync(path.join(base,'calc.js'),'utf8'),{Date,JSON,wx:{pageScrollTo(){}},Page:x=>def=x,require:x=>require(path.resolve(base,x))});
 const p={...def,data:JSON.parse(JSON.stringify(def.data)),setData(patch){for(const [k,v]of Object.entries(patch)){const keys=k.split('.');let t=this.data;for(const key of keys.slice(0,-1))t=t[key];t[keys.at(-1)]=v;}}};
 p.setData({form:{...p.data.form,...form(),ageOnly:true,age:'59'}});p.refreshPolicyQuestions();p.calculate();
 assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.timeline.receivingAge,69);
 p.reviewMakeup();assert.equal(p.data.result,null);assert.equal(p.data.gxMakeupOpen,true);assert.equal(p.data.planRecords,true);
 assert.equal(p.data.form.age,'59');assert.equal(p.data.form.years,'5');assert.equal(p.data.form.tier,200);
 assert.equal(p.data.form.gxStartYear,'');assert.equal(p.data.form.gxScopeReviewed,'unknown');assert.equal(p.data.form.gxTransitionEnabled,'no');
 const wxml=fs.readFileSync(path.join(base,'calc.wxml'),'utf8');assert.match(wxml,/按逐年交费/);assert.match(wxml,/以前实际漏交的年份/);assert.match(wxml,/bindtap="openPaymentPlanner"/);
});
