const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const registry=require('../miniprogram/utils/employee-registry'),{forecast}=require('../miniprogram/utils/forecast'),{stale}=require('../miniprogram/utils/employee-index');
const {estimateAccount}=require('../miniprogram/utils/employee-inputs'),docs=require('../miniprogram/utils/city-documents');
const D=require('../miniprogram/vendor/decimal');
const input=(patch={})=>({regionId:'540100',birthMonth:'1975-06',firstInsuredMonth:'2006-07',dataAsOf:'2026-10',paidMonths:240,principal:80000,interest:0,currentBase:7066.2,historicalIndex:'0.6',contributionType:'EMPLOYEE',pauseMonths:0,customMonths:0,plan:'CUSTOM',category:'MALE',historicalRights:false,tibetRetirementMonth:'2030-06',tibetWorkYears:'20',tibetScopeConfirmed:'yes',...patch});
const chosen=r=>forecast(r).scenarios.find(s=>s.plan===r.plan);
function page(store={}){let def;const file=path.join(__dirname,'../miniprogram/pages/index/index.js');vm.runInNewContext(fs.readFileSync(file,'utf8'),{Date,JSON,wx:{pageScrollTo(){},showModal(){},navigateTo(){},redirectTo(){}},Page:x=>def=x,require:x=>x.endsWith('/session')?{load:k=>store[k],save:(k,v)=>{store[k]=JSON.parse(JSON.stringify(v));}}:require(path.resolve(path.dirname(file),x))});return {...def,data:JSON.parse(JSON.stringify(def.data)),setData(patch){for(const[k,v]of Object.entries(patch)){let o=this.data;const a=k.split('.');for(const n of a.slice(0,-1))o=o[n];o[a.at(-1)]=v;}}};}

test('西藏7市共享2025工资参数及三项待遇，55岁按填入年月算而非全国63岁',()=>{
 const cs=registry.provinces.find(p=>p.id==='540000').cities;assert.equal(cs.length,7);
 for(const c of cs){const p=c.employee,r=forecast(input({regionId:c.id})),s=r.scenarios.find(s=>s.plan==='CUSTOM');
  assert.equal(p.status,'READY');assert.equal(p.min,7066.2);assert.equal(p.max,35331);assert.equal(p.pensionBase,11777);assert.equal(r.retirement.month,'2030-06');assert.equal(r.retirement.source,'USER_CONFIRMED');
  assert.equal(s.basic,'1884.32');assert.equal(s.plateau,'1059.93');assert.equal(s.totalLow,'3414.84');assert.equal(s.receiptMonth,'2030-07');assert.equal(s.minimumMonths,186);
 }
 const female=forecast(input({birthMonth:'1985-06',category:'FEMALE_50'}));assert.equal(female.retirement.ageMonths,540);assert.equal(female.retirement.month,'2030-06');
});

test('高原补贴10、15、20年边界独立核对，不能拿全部缴费年限替代',()=>{
 for(const [years,amount]of [['0','0.00'],['9.99','0.00'],['10','353.31'],['14.99','353.31'],['15','706.62'],['19.99','706.62'],['20','1059.93']])assert.equal(chosen(input({tibetWorkYears:years})).plateau,amount,years);
 assert.equal(chosen(input({tibetWorkYears:'10',paidMonths:241})).plateau,'353.31');
});

test('资格与工作年数未填、时间倒置、过渡权益及不可能的年限拦截',()=>{
 for(const patch of [{tibetScopeConfirmed:'unknown'},{tibetRetirementMonth:''},{tibetRetirementMonth:'2026-09'},{tibetWorkYears:''},{tibetWorkYears:'-1'},{tibetWorkYears:'40'},{tibetWorkYears:'31'},{tibetWorkYears:'10.001'},{firstInsuredMonth:'2000-06'},{historicalRights:true}])assert.throws(()=>forecast(input(patch)));
 assert.doesNotThrow(()=>forecast(input({firstInsuredMonth:'2000-07'})));
 assert.throws(()=>estimateAccount('MINIMUM','',240,7066.2,'2005-12',registry.capability('540100')),/2006年前/);
 assert.doesNotThrow(()=>forecast(input({firstInsuredMonth:'2005-12',principal:80000})));
});

test('延缴超出核对退休年月不擅自推到更晚领取，不够的方案不显示金额',()=>{
 const r=forecast(input({birthMonth:'1971-10',tibetRetirementMonth:'2026-10',paidMonths:60,plan:'CURRENT'}));
 for(const s of r.scenarios.filter(s=>s.plan!=='CUSTOM')){assert.equal(s.unsupported,true);assert.equal(s.qualified,false);assert.equal(s.totalLow,null);assert.equal(s.receiptMonth,undefined);assert.match(s.error,/先核对/);}
 const c=r.scenarios.find(s=>s.plan==='CUSTOM');assert.equal(c.qualified,false);assert.equal(c.receiptMonth,null);
});

test('多交一年账户按8%入账，新增待遇回收包含高原补贴差额，工作年数不随方案涨档',()=>{
 const s=chosen(input({customMonths:12,currentBase:14132.4,tibetWorkYears:'14.99'}));
 const index=new D('.6').mul(240).plus(new D('1.2').mul(12)).div(252);
 const basic=new D(11777).mul(new D(1).plus(index)).div(2).mul(21).mul('.01'),plateau=new D(11777).mul(index).mul('.05');
 const credit=new D('14132.4').mul('.08').mul(12),increment=basic.minus('1884.32').plus(plateau.minus('353.31')).plus(credit.div(170));
 assert.equal(s.futurePersonalCost,'13567.10');assert.equal(s.account,'93567.10');assert.equal(s.plateauRate,'.05');assert.equal(s.plateau,plateau.toFixed(2));assert.equal(s.incrementalLow,increment.toFixed(2));
 assert.equal(s.totalLow,basic.plus(plateau).plus(new D(80000).plus(credit).div(170)).toFixed(2));
});

test('西藏相同页面真实事件：缺确认提示、填写计算、改方案、编辑重填与跨省隔离',()=>{
 const p=page();p.onLoad();p.regionChanged({detail:{regionId:'540100'}});p.calculate();assert.equal(p.data.result,null);assert.match(p.data.error,/核对/);assert.equal(p.data.tibet,true);
 p.input({currentTarget:{dataset:{key:'tibetRetirementMonth'}},detail:{value:'2041-10'}});p.input({currentTarget:{dataset:{key:'tibetWorkYears'}},detail:{value:'20'}});p.tibetScope({detail:{value:['yes']}});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.retirement.month,'2041-10');assert.match(p.data.result.referenceNote,/高原补贴/);
 p.choosePlan({currentTarget:{dataset:{plan:'MINIMUM_STOP'}}});assert.equal(p.data.result.chosen.plan,'MINIMUM_STOP');p.edit();assert.equal(p.data.form.tibetWorkYears,'20');
 p.input({currentTarget:{dataset:{key:'birthMonth'}},detail:{value:'1985-06'}});assert.equal(p.data.form.tibetScopeConfirmed,'unknown');p.calculate();assert.equal(p.data.result,null);
 p.regionChanged({detail:{regionId:'650100'}});assert.equal(p.data.tibet,false);assert.equal(p.data.form.tibetRetirementMonth,'');p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.regionId,'650100');
 p.regionChanged({detail:{regionId:'540100'}});p.reset();assert.equal(p.data.form.regionId,'540100');assert.notEqual(p.data.form.tibetScopeConfirmed,'yes');
});

test('西藏缓存版本及未确认旧会话必须重算；政策只挂西藏职工入口',()=>{
 const r=forecast(input()),p=registry.capability('540100');assert.equal(stale(r,p,'2026-10'),false);const old={...r};delete old.calculationVersion;assert.equal(stale(old,p,'2026-10'),true);
 const d=docs.find(d=>d.id==='tibet-employee-formula-2006');assert.equal(d.kind,'employee');assert.equal(d.cityIds.length,7);assert.ok(!d.cityIds.includes('650100'));assert.match(d.sections[0].text,/11%/);
 const q=page();q.onLoad();q.regionChanged({detail:{regionId:'540100'}});q.setData({'form.tibetScopeConfirmed':'unknown',result:r});const restored=page({employee:q.data});restored.onLoad();assert.equal(restored.data.result,null);
 assert.equal(registry.capability('540100','flexible'),null);assert.equal(require('../miniprogram/utils/resident-registry').cities.length,369);
 const w=fs.readFileSync(path.join(__dirname,'../miniprogram/pages/index/index.wxml'),'utf8');assert.match(w,/核对后的退休年月/);assert.match(w,/tibet\?'已核对退休年月/);assert.match(w,/result.chosen.plateau/);
});
