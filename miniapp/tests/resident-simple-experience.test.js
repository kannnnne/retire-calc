const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function page(){let d;const file=path.join(__dirname,'../miniprogram/resident/pages/calc/calc.js');vm.runInNewContext(fs.readFileSync(file,'utf8'),{Page:x=>d=x,Date,JSON,wx:{pageScrollTo(){}},require:x=>require(path.resolve(path.dirname(file),x))});const p={...d,data:JSON.parse(JSON.stringify(d.data)),setData(values){for(const[k,v]of Object.entries(values)){const a=k.split('.');let o=this.data;for(const n of a.slice(0,-1))o=o[n];o[a.at(-1)]=v;}}};p.onLoad();p.regionChoice({detail:{regionId:'450800'}});p.input({currentTarget:{dataset:{key:'age'}},detail:{value:'60'}});return p;}
test('模糊记录仍用原引擎八种组合，主结果统一展示保守安排和已交范围',()=>{
 const p=page();p.historyCertainty({currentTarget:{dataset:{value:'rough'}}});p.calculate();assert.equal(p.data.error,'');const r=p.data.result;assert.equal(r.uncertainty.trials.length,8);assert.equal(p.data.paymentSummary.paid,'约3—4');assert.equal(p.data.paymentSummary.required,15);assert.equal(r.chosen.timeline.normalYears,12);assert.equal(r.chosen.timeline.receivingAge,72);assert.equal(r.chosen.annualTotal,200);assert.equal(r.chosen.total,'2400.00');assert.equal(p.data.form.firstPaidYear,'');assert.equal(p.data.form.gxTransitionReviewed,'unknown');assert.equal(r.makeup,null);
});
test('准确记录逐年安排直接显示，补缴仍由原有入口另核资格',()=>{
 const p=page();p.setData({'form.years':'4','form.pastAnnual':'300','form.paidThisYear':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.paymentSummary.paid,'4');assert.equal(p.data.paymentSummary.required,15);assert.equal(p.data.result.chosen.timeline.receivingAge,71);assert.equal(p.data.result.chosen.total,'2200.00');p.openKnownRecords();assert.equal(p.data.planning,true);assert.equal(p.data.form.gxTransitionReviewed,'unknown');
});
test('各地共用一个结果模板，明确区分月领、年交、剩余年数，不再使用广西独立双卡片',()=>{
 const w=fs.readFileSync(path.join(__dirname,'../miniprogram/resident/pages/calc/calc.wxml'),'utf8');assert.equal((w.match(/退休后，每月约领/g)||[]).length,1);assert.ok(w.includes('以后每年交'));assert.ok(w.includes('还需交'));assert.ok(w.includes('累计需交'));for(const old of ['routeOverview','先看两种交法','返回看两种交法','每年接着交'])assert.equal(w.includes(old),false);
 const {getRegion}=require('../miniprogram/resident/data/regions');for(const id of ['450100','450200','450800']){const label=getRegion(id).referenceLabel;assert.match(label,/市 · 广西标准参考/);assert.doesNotMatch(label,/南宁自治区|柳州自治区/);}
 for(const id of ['450100','450200','450800','440100']){const p=page();p.regionChoice({detail:{regionId:id}});p.setData({'form.years':'5','form.paidThisYear':'yes','form.age':'55'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.paymentSummary.required,15);assert.equal(p.data.paymentSummary.paid,'5');}
});
test('查不到记录有可返回的问询卡，保存结果和费用，不私自加入补缴；查到后回准确填写',()=>{
 const p=page();p.historyCertainty({currentTarget:{dataset:{value:'rough'}}});p.calculate();const before=JSON.stringify(p.data.result);p.openKnownRecords();assert.equal(p.data.recordHelp,true);assert.equal(p.data.planning,false);p.closeRecordHelp();assert.equal(JSON.stringify(p.data.result),before);p.openRecordHelp();p.recordsReady();assert.equal(p.data.recordHelp,false);assert.equal(p.data.result,null);assert.equal(p.data.form.historyUncertain,false);assert.equal(p.data.form.paidThisYear,'unknown');assert.equal(p.data.form.regionId,'450800');assert.equal(p.data.form.gxTransitionReviewed,'unknown');
});
test('点一次补足但没确认，不再悄悄返回原逐年结果',()=>{
 const p=page();p.setData({'form.paidThisYear':'yes'});p.calculate();p.openPaymentPlanner();p.plannerMode({currentTarget:{dataset:{value:'confirmed'}}});p.calculate();assert.equal(p.data.result,null);assert.equal(p.data.planning,true);assert.match(p.data.error,/这次没有计算补缴/);assert.ok(p.data.planReturn.result);p.cancelPaymentPlanner();assert.ok(p.data.result);
});
test('模糊记录、未知今年缴费都不能绕过真实补缴确认',()=>{
 const p=page();p.historyCertainty({currentTarget:{dataset:{value:'rough'}}});p.setData({'form.gxMakeupRows':[{mode:'missing',start:'2012',end:'2020',target:200}],'form.gxScopeReviewed':'yes','form.gxStartYear':'2012'});p.calculate();assert.equal(p.data.result,null);assert.match(p.data.error,/先按查询记录/);
});
test('大概范围也校验年数和金额，不把乱填静默变成有效计划',()=>{
 for(const patch of [{'form.roughYearsMin':'5','form.roughYearsMax':'3'},{'form.roughAnnualMin':'500','form.roughAnnualMax':'300'},{'form.roughYearsMin':''},{'form.roughAnnualMin':'0'}]){const p=page();p.historyCertainty({currentTarget:{dataset:{value:'rough'}}});p.setData(patch);p.calculate();assert.equal(p.data.result,null);assert.ok(p.data.error);assert.equal(p.data.form.gxTransitionReviewed,'unknown');}
});
test('旧会话或示例没有新增范围字段时，首次切记不清仍有可改的3至4年和300至400元',()=>{
 const p=page();for(const key of ['roughYearsMin','roughYearsMax','roughAnnualMin','roughAnnualMax'])delete p.data.form[key];p.historyCertainty({currentTarget:{dataset:{value:'rough'}}});assert.equal(p.data.form.roughYearsMin,'3');assert.equal(p.data.form.roughAnnualMax,'400');p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.uncertainty.trials.length,8);p.historyCertainty({currentTarget:{dataset:{value:'exact'}}});assert.equal(p.data.form.years,'');assert.equal(p.data.form.pastAnnual,'');
});
test('相同月领不重复摆满屏，常用金额保留当前所选且能展开；分年记录不会被未知今年状态误挡',()=>{
 const p=page();p.historyCertainty({currentTarget:{dataset:{value:'rough'}}});p.calculate();assert.ok(p.data.planOptions.length<=4);assert.equal(new Set(p.data.planOptions.map(o=>o.monthly)).size,p.data.planOptions.length);p.moreFutureOptions();assert.ok(p.data.planOptions.length>4);assert.ok(p.data.planOptions.some(o=>o.annual===p.data.result.chosen.annual));
 const q=page();q.setData({'form.years':'4','form.historyMode':'segments','form.segments':[{start:'2023',end:'2026',annual:'300'}]});q.calculate();assert.equal(q.data.error,'');assert.equal(q.data.result.uncertainty.trials.length,1);assert.equal(q.data.result.uncertainty.yearUnknown,false);assert.equal(q.data.result.pastPaid,'1200.00');
});

test('累计需交年数取规则门槛，不随已交20年变成20年，核定过渡仍用实际门槛',()=>{
 const {summary}=require('../miniprogram/resident/utils/simple-experience');assert.equal(summary({paidYears:20,missing:0}).required,15);assert.equal(summary({paidYears:12,missing:0,requiredYears:10,approvedPlan:{mode:'combined'}}).required,10);
});
