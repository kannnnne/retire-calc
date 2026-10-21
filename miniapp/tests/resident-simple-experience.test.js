const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function page(){let d;const file=path.join(__dirname,'../miniprogram/resident/pages/calc/calc.js');vm.runInNewContext(fs.readFileSync(file,'utf8'),{Page:x=>d=x,Date,JSON,wx:{pageScrollTo(){}},require:x=>require(path.resolve(path.dirname(file),x))});const p={...d,data:JSON.parse(JSON.stringify(d.data)),setData(values){for(const[k,v]of Object.entries(values)){const a=k.split('.');let o=this.data;for(const n of a.slice(0,-1))o=o[n];o[a.at(-1)]=v;}}};p.onLoad();p.regionChoice({detail:{regionId:'450800'}});p.input({currentTarget:{dataset:{key:'age'}},detail:{value:'60'}});return p;}
test('贵港60岁只记得3至4年、300至400元，八种组合由原引擎算，首次年份和资格仍未知',()=>{
 const p=page();assert.equal(p.data.form.paidThisYear,'unknown');p.historyCertainty({currentTarget:{dataset:{value:'rough'}}});p.calculate();assert.equal(p.data.error,'');const r=p.data.result,o=p.data.routeOverview;assert.equal(r.uncertainty.trials.length,8);assert.equal(o.years,'11—12');assert.equal(o.makeupYears,'11—12');assert.equal(o.makeupCost,'2200—2400');assert.equal(o.monthly,'220');assert.equal(o.makeupMonthly,'210');assert.equal(o.age,'70—72');assert.equal(p.data.form.firstPaidYear,'');assert.equal(p.data.form.gxScopeReviewed,'unknown');assert.equal(p.data.form.gxTransitionReviewed,'unknown');assert.equal(p.data.form.gxTransitionEnabled,'no');assert.equal(p.data.form.gxMakeupRows.length,0);assert.equal(r.makeup,null);
});
test('准确记录也先并列逐年和条件补缴，而非把71岁当唯一办法',()=>{
 const p=page();p.setData({'form.years':'4','form.pastAnnual':'300','form.paidThisYear':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.routeOverview.age,'71');assert.equal(p.data.routeOverview.total,'2200');assert.equal(p.data.routeOverview.makeupCost,'2200');p.showOrdinaryRoute();assert.equal(p.data.routeOverview,null);assert.equal(p.data.result.chosen.timeline.receivingAge,71);p.showRoutes();assert.equal(p.data.routeOverview.age,'71');
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
