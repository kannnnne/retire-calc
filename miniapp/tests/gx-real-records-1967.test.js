const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const planner=require('../miniprogram/resident/utils/history-planner'),{calculate}=require('../miniprogram/resident/utils/calculate'),{getRegion}=require('../miniprogram/resident/data/regions');
const form=patch=>({regionId:'450800',localArea:'',birth:'1967-11',asOf:'2026-10',ageOnly:false,never:false,years:'5',pastAnnual:'200',balance:'',accountMode:'estimate',historyMode:'segments',segments:[{start:'2021',end:'2021',annual:'200'},{start:'2023',end:'2026',annual:'200'}],firstPaidYear:'2021',tier:6000,paidThisYear:'yes',eligible:'yes',ordinary:'yes',gxStartYear:'2012',gxScopeReviewed:'yes',...patch});
const upgrades=[{mode:'upgrade',start:'2021',end:'2021',original:200,target:6000},{mode:'upgrade',start:'2023',end:'2026',original:200,target:6000,subsidyAlready:35}];
function page(store={}){let config;const base=path.join(__dirname,'../miniprogram/resident/pages/calc');vm.runInNewContext(fs.readFileSync(path.join(base,'calc.js'),'utf8'),{Date,JSON,wx:{pageScrollTo(){}},Page:x=>config=x,require:x=>x.endsWith('/session')?{load:k=>store[k],save:(k,v)=>{store[k]=JSON.parse(JSON.stringify(v));}}:require(path.resolve(base,x))});return {...config,data:JSON.parse(JSON.stringify(config.data)),setData(patch){for(const[k,v]of Object.entries(patch)){let t=this.data;const a=k.split('.');for(const x of a.slice(0,-1))t=t[x];t[a.at(-1)]=v;}}};}

test('复现真实截图35000元补1年提5年再交9年，850只是这一缴费方案',()=>{
 const r=calculate(form({gxMakeupRows:[...upgrades,{mode:'missing',start:'2022',end:'2022',target:6000}]}));
 assert.equal(r.makeup.cost,'35000.00');assert.equal(r.makeup.addedYears,1);assert.equal(r.makeup.upgradedYears,5);assert.equal(r.chosen.total,'89000.00');assert.equal(r.chosen.timeline.receivingAge,68);assert.equal(r.chosen.timeline.normalYears,9);assert.equal(r.chosen.low,'852.62');
});

test('按完整记录起草9个漏年，首次2021不会排除2013等参保前年度，且不直接批准',()=>{
 const f=form(),s=planner.suggest(f);assert.deepEqual(s.selected,[2022,2020,2019,2018,2017,2016,2015,2014,2013]);assert.equal(s.normalYears,1);assert.equal(s.needed,9);assert.equal(f.gxMakeupRows,undefined);
 assert.throws(()=>planner.suggest(form({historyMode:'simple'})),/分年记录/);assert.throws(()=>planner.suggest(form({paidThisYear:'unknown'})),/分年记录/);
 assert.throws(()=>planner.suggest(form({gxStartYear:'2021'})),/年份还不够/);
});

test('60岁前补9年最低档1800并于2027年交200，2027年12月参考领取约210',()=>{
 const f=form({tier:200}),plan=planner.build(f,planner.suggest(f).selected,200),r=calculate({...f,gxMakeupRows:plan.rows});
 assert.equal(plan.cost,'1800.00');assert.equal(r.chosen.total,'2000.00');assert.equal(r.chosen.receiptMonth,'2027-12');assert.equal(r.chosen.timeline.receivingAge,60);assert.equal(r.chosen.timeline.finalYears,15);assert.equal(r.chosen.low,'207.83');assert.equal(r.makeup.subsidy,'0.00');assert.equal(r.chosen.subsidy,'35.00');
});

test('各年最高档正确拆2010—2013一千、2014—2018两千、2019起六千，不整段套6000',()=>{
 const f=form(),p=planner.build(f,[2012,2013,2014,2018,2019,2020,2022],'MAX');assert.equal(p.target,'MAX');assert.equal(p.cost,'24000.00');
 assert.equal(p.rows.find(r=>r.start==='2012').target,1000);assert.equal(p.rows.find(r=>r.start==='2014').target,2000);assert.equal(p.rows.find(r=>r.start==='2018').target,2000);assert.equal(p.rows.find(r=>r.start==='2019').target,6000);
 const all=planner.build(f,planner.suggest(f).selected,'MAX');assert.equal(all.cost,'29000.00');assert.equal(all.targetLabel,'按各年份最高档');assert.equal(all.values.at(-1),'MAX');assert.ok(all.rows.every(r=>typeof r.target==='number'));
});

test('已交5年提档只补差额：现在58000，2027交6000，总64000，60岁起每月约660',()=>{
 const f=form(),rows=planner.build(f,planner.suggest(f).selected,'MAX').rows,r=calculate({...f,gxMakeupRows:[...upgrades,...rows]});
 assert.equal(r.makeup.addedYears,9);assert.equal(r.makeup.upgradedYears,5);assert.equal(r.makeup.cost,'58000.00');assert.equal(r.makeup.subsidy,'165.00');assert.equal(r.chosen.total,'64000.00');assert.equal(r.chosen.account,'65365.00');assert.equal(r.chosen.low,'656.25');assert.equal(r.chosen.receiptMonth,'2027-12');assert.equal(r.chosen.timeline.normalYears,1);assert.equal(r.chosen.timeline.finalYears,15);
 assert.throws(()=>calculate({...f,gxMakeupRows:[...upgrades,...rows],gxScopeReviewed:'unknown'}),/确认/);
 // Her age today does not prove a subsidised original-scheme transition entitlement.
 assert.throws(()=>calculate(form({birth:'1967-11',asOf:'2027-11',paidThisYear:'no',gxMakeupRows:[],gxTransitionEnabled:'yes',gxTransitionStart:'2012-01',gxTransitionYears:'10',gxTransitionReviewed:'yes'})),/不足15年/);
});

test('真实页面事件保留已交记录和提档，漏年草稿需确认，最终60岁结果可修改恢复且跨省清空',()=>{
 const store={},p=page(store);p.setData({form:{...p.data.form,...form({gxStartYear:'2012',gxMakeupRows:[...upgrades],gxScopeReviewed:'yes'})}});p.refreshPolicyQuestions();p.calculate();assert.equal(p.data.error,'');
 p.openMissingPlan();assert.equal(p.data.form.gxStartYear,'2012');assert.equal(p.data.form.firstPaidYear,'2021');assert.ok(p.data.gxPlan.years.some(y=>y.year===2013));assert.equal(p.data.gxPlan.years.find(y=>y.year===2021).paid,true);
 p.suggestMissing();assert.equal(p.data.gxPlan.count,9);const max=p.data.gxPlan.values.indexOf('MAX');p.missingTier({detail:{value:String(max)}});assert.equal(p.data.gxPlan.cost,'29000.00');
 p.applyMissingPlan();assert.match(p.data.error,/未确认/);p.missingConfirm();p.applyMissingPlan();assert.equal(p.data.error,'');assert.equal(p.data.display.monthly,'660');assert.equal(p.data.result.chosen.timeline.receivingAge,60);assert.equal(p.data.result.chosen.total,'64000.00');assert.equal(p.data.result.paidYears,5);
 p.onHide();const q=page(store);q.onLoad();assert.equal(q.data.result.chosen.receiptMonth,'2027-12');q.edit();assert.equal(q.data.form.segments.length,2);q.regionChoice({detail:{regionId:'440100'}});assert.equal(q.data.form.gxMakeupRows.length,0);assert.equal(q.data.form.gxStartYear,'');
});

test('广西14市复用年份上限，首屏唯一补缴入口在换方案折叠前，未到60不伪造过渡资格',()=>{
 for(const c of require('../miniprogram/utils/resident-registry').cities.filter(c=>c.provinceId==='450000')){const p=planner.build(form({regionId:c.id}),[2013,2014,2019],'MAX',c.resident);assert.equal(p.cost,'9000.00');}
 const w=fs.readFileSync(path.join(__dirname,'../miniprogram/resident/pages/calc/calc.wxml'),'utf8');assert.equal((w.match(/bindtap="openPaymentPlanner"/g)||[]).length,1);assert.ok(w.indexOf('bindtap="openPaymentPlanner"')<w.indexOf('<view>换个方案</view>'));assert.match(w,/可补年份从/);assert.match(w,/补漏缴、补差额/);assert.match(w,/历史补缴不加补贴/);
});
