const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const planner=require('../miniprogram/resident/utils/history-planner');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const registry=require('../miniprogram/utils/city-policies'),local=require('../miniprogram/utils/local-resident-policies');
const f=(patch={})=>({regionId:'450800',localArea:'guiping',birth:'1967-10',ageOnly:false,asOf:'2026-10',years:'5',balance:'',pastAnnual:'360',tier:200,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',gxStartYear:'2012',...patch});
function page(){let config;const base=path.join(__dirname,'../miniprogram/resident/pages/calc');vm.runInNewContext(fs.readFileSync(path.join(base,'calc.js'),'utf8'),{Date,JSON,wx:{pageScrollTo(){}},Page:x=>config=x,require:x=>require(path.resolve(base,x))});return {...config,data:JSON.parse(JSON.stringify(config.data)),setData(patch){for(const[k,v]of Object.entries(patch)){const keys=k.split('.');let t=this.data;for(const key of keys.slice(0,-1))t=t[key];t[keys.at(-1)]=v;}}};}
test('漏缴年份工具不从年龄或桂平2012建制自动捏造可补年份',()=>{
 for(const year of ['',2009,2026,'abc']){const p=planner.build(f({gxStartYear:year}),[2012]);assert.equal(p.years.length,0);assert.equal(p.count,0);assert.ok(p.error);}
 const p=planner.build(f());assert.equal(p.years.length,14);assert.equal(p.count,0);assert.equal(p.cost,'0.00');assert.equal(p.years.at(-1).year,2025);
});
test('点选漏缴旧年按共同法定档次算费，不用6000倒套2012旧年',()=>{
 const p=planner.build(f({historyMode:'segments',segments:[{start:'2022',end:'2026',annual:'360'}]}),Array.from({length:14},(_,i)=>2012+i),6000);
 assert.equal(p.count,10);assert.equal(p.target,200);assert.equal(p.cost,'2000.00');assert.equal(p.tiers.at(-1),1000);assert.ok(!p.tiers.includes(6000));
 assert.equal(p.rows.length,1);assert.deepEqual(p.rows[0],{mode:'missing',start:'2012',end:'2021',target:200});assert.equal(p.years.find(x=>x.year===2022).paid,true);assert.equal(p.years.find(x=>x.year===2022).selected,false);
 const recent=planner.build(f({gxStartYear:'2019'}),[2019,2020],6000);assert.equal(recent.cost,'12000.00');
});
test('不连续漏年拆段，重复或未来年份不能制造补缴年数',()=>{
 const p=planner.build(f(),[2012,2012,2013,2015,2026,2030,2009],300);assert.equal(p.count,3);assert.equal(p.rows.length,2);assert.equal(p.cost,'900.00');
 const young=planner.build(f({birth:'2000-10',gxStartYear:'2012'}),[2012]);assert.ok(young.error);
});
test('桂平分区只核2012年份，不假填月份或开放无条件60岁补足',()=>{
 const p=local.resolve(registry.capability('450800','resident'),'guiping');assert.equal(p.gxSchemeYear,2012);assert.equal(p.gxSchemeStart,undefined);assert.equal(p.lumpAt60,undefined);assert.equal(p.provincial,true);
 assert.throws(()=>calculate(f({gxStartYear:'2011',gxScopeReviewed:'yes',gxMakeupRows:[{mode:'missing',start:'2011',end:'2011',target:200}]})),/原制度始于2012/);
 assert.throws(()=>calculate(f({birth:'1960-10',years:'9',gxTransitionEnabled:'yes',gxTransitionStart:'2011-07',gxTransitionYears:'6',gxTransitionReviewed:'yes'})),/年份为2012/);
});
test('贵港59岁5年真实页面点选核对10个漏年后，由69岁改为满60岁后领取',()=>{
 const p=page();p.setData({form:{...p.data.form,...f({ageOnly:true,age:'59',gxStartYear:''})}});p.refreshPolicyQuestions();p.calculate();assert.equal(p.data.result.chosen.timeline.receivingAge,69);
 p.openMissingPlan();assert.equal(p.data.form.gxStartYear,'');assert.equal(p.data.gxPlan.count,0);
 p.missingStart({detail:{value:'2012'}});for(let year=2012;year<=2021;year++)p.missingYear({currentTarget:{dataset:{year}}});assert.equal(p.data.gxPlan.cost,'2000.00');
 p.applyMissingPlan();assert.match(p.data.error,/未确认/);assert.equal(p.data.result,null);
 p.missingConfirm();p.applyMissingPlan();assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.timeline.receivingAge,60);assert.equal(p.data.result.chosen.total,'2000.00');assert.equal(p.data.result.makeup.subsidy,'0.00');assert.equal(p.data.gxPlanOpen,false);
 assert.equal(p.data.form.gxTransitionEnabled,'no');assert.equal(p.data.form.gxTransitionReviewed,'unknown');
});
test('60岁路线可核对历史补缴与旧制资格；已有提档记录不会被年份工具覆盖',()=>{
 const p=page();p.setData({form:{...p.data.form,...f({birth:'1966-10'})}});p.refreshPolicyQuestions();p.calculate();assert.equal(p.data.canGXTransition,true);assert.equal(p.data.result.chosen.timeline.receivingAge,70);
 p.reviewTransition();assert.equal(p.data.planMode,'confirmed');assert.equal(p.data.planRecords,true);assert.equal(p.data.form.gxTransitionEnabled,'no');
 const rows=[{mode:'upgrade',start:'2022',end:'2022',original:200,target:6000}];p.setData({'form.gxMakeupRows':rows});p.openMissingPlan();assert.deepEqual(p.data.form.gxMakeupRows,rows);assert.equal(p.data.gxPlanOpen,true);assert.equal(p.data.gxMakeupOpen,true);
});
test('改变年份或关键个人信息撤销补缴确认，切市清空年份草稿',()=>{
 const p=page();p.setData({form:{...p.data.form,...f({ageOnly:true,age:'59'})}});p.refreshPolicyQuestions();p.openMissingPlan();p.missingYear({currentTarget:{dataset:{year:2012}}});p.missingConfirm();assert.equal(p.data.form.gxScopeReviewed,'yes');
 p.missingYear({currentTarget:{dataset:{year:2013}}});assert.equal(p.data.form.gxScopeReviewed,'unknown');p.missingConfirm();p.input({currentTarget:{dataset:{key:'age'}},detail:{value:'58'}});assert.equal(p.data.form.gxScopeReviewed,'unknown');
 p.regionChoice({detail:{regionId:'440100'}});assert.equal(p.data.gxPlanOpen,false);assert.equal(p.data.gxPlan,null);assert.equal(p.data.form.gxStartYear,'');
});
test('年份选择时底部开始计算也走补缴校验，不悄悄返回原69岁方案',()=>{
 const p=page();p.setData({form:{...p.data.form,...f({ageOnly:true,age:'59'})}});p.refreshPolicyQuestions();p.openMissingPlan();
 for(let y=2012;y<=2021;y++)p.missingYear({currentTarget:{dataset:{year:y}}});
 p.calculate({type:'tap'});assert.match(p.data.error,/未确认/);assert.equal(p.data.result,null);
 p.missingConfirm();p.calculate({type:'tap'});assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.timeline.receivingAge,60);
 const wxml=fs.readFileSync(path.join(__dirname,'../miniprogram/resident/pages/calc/calc.wxml'),'utf8');assert.equal((wxml.match(/bindchange="localArea"/g)||[]).length,1);
});
test('从未参保先给登记路径，已交满15年也能进入提高旧年档次入口',()=>{
 const p=page();p.setData({form:{...p.data.form,...f({never:true,years:'0',paidThisYear:'no'})}});p.refreshPolicyQuestions();p.openMissingPlan();assert.equal(p.data.error,'');assert.equal(p.data.gxPlanOpen,true);p.applyMissingPlan();assert.match(p.data.error,/先登记/);assert.equal(p.data.form.gxScopeReviewed,'unknown');
 const q=page();q.setData({form:{...q.data.form,...f({birth:'1966-10',years:'15'})}});q.refreshPolicyQuestions();q.calculate();assert.equal(q.data.result.chosen.timeline.receivingAge,60);q.reviewUpgrade();assert.equal(q.data.result,null);assert.equal(q.data.gxUiRows.length,1);assert.equal(q.data.gxUiRows[0].mode,'upgrade');assert.equal(q.data.form.gxMakeupRows[0].target,'');assert.equal(q.data.form.gxScopeReviewed,'unknown');
});
