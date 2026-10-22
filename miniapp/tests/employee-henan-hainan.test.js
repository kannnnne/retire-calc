const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const registry=require('../miniprogram/utils/employee-registry'),{forecast}=require('../miniprogram/utils/forecast');
const {estimateAccount}=require('../miniprogram/utils/employee-inputs');
const documents=require('../miniprogram/utils/city-documents');
const input=(id,patch={})=>({regionId:id,birthMonth:'1985-06',firstInsuredMonth:'2005-07',dataAsOf:'2026-10',paidMonths:240,principal:80000,interest:0,currentBase:registry.capability(id).min,historicalIndex:'0.6',contributionType:'EMPLOYEE',pauseMonths:0,customMonths:0,plan:'CUSTOM',category:'MALE',historicalRights:false,...patch});
function page(){let def;const file=path.join(__dirname,'../miniprogram/pages/index/index.js');vm.runInNewContext(fs.readFileSync(file,'utf8'),{Date,JSON,wx:{pageScrollTo(){},showModal(){},navigateTo(){},redirectTo(){}},Page:x=>def=x,require:x=>x.endsWith('/session')?{load(){return null;},save(){}}:require(path.resolve(path.dirname(file),x))});return {...def,data:JSON.parse(JSON.stringify(def.data)),setData(patch){for(const[k,v]of Object.entries(patch)){let o=this.data;const a=k.split('.');for(const n of a.slice(0,-1))o=o[n];o[a.at(-1)]=v;}}};}
test('河南18项与海南19项省级普通参考全部开放，独立核对待遇而非套缴费工资',()=>{
 for(const [province,count,base,wage,min,max,basic,total]of [
  ['410000',18,6606,6385,3831,19155,'1056.96','1740.72'],
  ['460000',19,7599,8188,4912.8,24564,'1215.84','1899.60']]){
  const cities=registry.provinces.find(p=>p.id===province).cities;assert.equal(cities.length,count);
  for(const c of cities){const p=c.employee;assert.equal(p.status,'READY');assert.equal(p.pensionBase,base);assert.equal(p.indexWage,wage);assert.equal(p.min,min);assert.equal(p.max,max);assert.equal(p.parameterStatus,'REFERENCE');
   const r=forecast(input(c.id)),s=r.scenarios.find(s=>s.plan==='CUSTOM');assert.equal(s.basic,basic);assert.equal(s.totalLow,total);assert.equal(s.account,'80000.00');assert.equal(s.futurePersonalCost,'0.00');
  }
 }
 assert.notEqual(registry.capability('410100').pensionBase,6738);assert.notEqual(registry.capability('460100').pensionBase,8188);
});
test('两省缴费新范围各自按生效月拦截，海南不是一月、河南不是十月',()=>{
 assert.throws(()=>forecast(input('410100',{dataAsOf:'2025-06'})),/2025-07/);
 assert.doesNotThrow(()=>forecast(input('410100',{dataAsOf:'2025-07'})));
 assert.throws(()=>forecast(input('460100',{dataAsOf:'2025-09'})),/2025-10/);
 assert.doesNotThrow(()=>forecast(input('460100',{dataAsOf:'2025-10'})));
});
test('海南年限按规定保留四位，不能误用其他省份年限舍入规则',()=>{
 const s=forecast(input('460100',{paidMonths:241,historicalIndex:'3'})).scenarios.find(s=>s.plan==='CUSTOM');
 // 241 months -> 20.0833 years; 7599 * (1 + 3) / 2 * 20.0833 * 1%.
 assert.equal(s.basic,'3052.26');assert.equal(s.totalMonths,241);
 assert.equal(forecast(input('410100',{paidMonths:241,historicalIndex:'3'})).scenarios.find(s=>s.plan==='CUSTOM').basic,'2653.41');
});
test('海南2008年前账户不按8%粗估；实际查询余额仍可计算，不影响河南旧边界',()=>{
 const hn=registry.capability('460100');
 for(const [mode,value]of [['MINIMUM',''],['DEDUCTION','400'],['SALARY','5000']])assert.throws(()=>estimateAccount(mode,value,120,4912.8,'2007-12',hn),/2008年前/);
 assert.equal(estimateAccount('SALARY','5000',120,4912.8,'2008-01',hn).principal,'48000.00');
 assert.doesNotThrow(()=>estimateAccount('SALARY','5000',120,3831,'2006-01',registry.capability('410100')));
 assert.doesNotThrow(()=>forecast(input('460100',{principal:30000,firstInsuredMonth:'2000-01'})));
 const p=page();p.onLoad();p.regionChanged({detail:{regionId:'460100'}});p.setData({'form.firstInsuredMonth':'2007-01',firstAuto:false});p.refreshDerived();p.calculate();assert.equal(p.data.result,null);assert.match(p.data.error,/2008年前/);assert.equal(p.data.accountOpen,true);
 p.setData({accountMode:'known','form.principal':'80000'});p.refreshDerived();p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.accountPrincipal,'80000');assert.equal(p.data.result.estimatedAccount,false);
});
test('海南旧年限制在主结果可见，来源年份、新闻索引和原件状态如实保留',()=>{
 const p=page();p.onLoad();p.regionChanged({detail:{regionId:'460100'}});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.parameter.year,2022);assert.match(p.data.result.referenceNote,/2022年旧参数/);assert.match(p.data.result.referenceNote,/明显低于/);
 const wxml=fs.readFileSync(path.join(__dirname,'../miniprogram/pages/index/index.wxml'),'utf8');assert.match(wxml,/\{\{result\.referenceNote\}\}/);
 const henan=registry.capability('410100');assert.equal(henan.sourceStatus,'NEWSPAPER_POLICY_EXPLANATION');assert.match(henan.sources.find(s=>s.id==='henan-employee-base-2024').text,/搜索索引正文/);
 assert.equal(registry.capability('460100').sourceStatus,'GOVERNMENT_HISTORICAL');
 const base=documents.find(d=>d.id==='hainan-employee-base-2022');assert.equal(base.kind,'employee');assert.equal(base.cityIds.length,19);assert.ok(!base.cityIds.includes('410100'));
});
test('只扩单位职工，两省普通入口和原有居民及灵活就业范围隔离',()=>{
 for(const id of ['410100','410800','419001','460100','460200','469030']){
  assert.equal(registry.capability(id,'flexible'),null);assert.throws(()=>forecast(input(id,{contributionType:'FLEXIBLE'})),/开放/);
 }
 assert.equal(require('../miniprogram/utils/resident-registry').cities.length,369);assert.equal(require('../miniprogram/utils/city-policies').cities.length,40);
});
