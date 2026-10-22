const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const registry=require('../miniprogram/utils/employee-registry'),legacy=require('../miniprogram/utils/city-policies'),residents=require('../miniprogram/utils/resident-registry');
const profiles=require('../miniprogram/utils/national-employee-policies'),{forecast,policy}=require('../miniprogram/utils/forecast');
const D=require('../miniprogram/vendor/decimal');
const input=(id,patch={})=>({regionId:id,birthMonth:'1985-06',firstInsuredMonth:'2005-07',dataAsOf:'2026-10',paidMonths:240,principal:80000,interest:0,currentBase:registry.capability(id).min,historicalIndex:'0.6',contributionType:'EMPLOYEE',pauseMonths:0,customMonths:0,plan:'CUSTOM',category:'MALE',historicalRights:false,szScopeConfirmed:'yes',...patch});
function page(relative='pages/index/index.js',store){let def;const file=path.join(__dirname,'../miniprogram',relative),modals=[];vm.runInNewContext(fs.readFileSync(file,'utf8'),{Date,JSON,wx:{pageScrollTo(){},showModal(v){modals.push(v);},navigateTo(){},redirectTo(){}},Page:x=>def=x,require:x=>x.endsWith('/session')&&store?{load:k=>store[k],save:(k,v)=>{store[k]=JSON.parse(JSON.stringify(v));}}:require(path.resolve(path.dirname(file),x))});return {...def,modals,data:JSON.parse(JSON.stringify(def.data)),setData(patch){for(const[k,v]of Object.entries(patch)){let o=this.data;const a=k.split('.');for(const n of a.slice(0,-1))o=o[n];o[a.at(-1)]=v;}}};}
test('职工31省369项选择、283项可算，缺项明确跳过；居民369项与灵活40城不被暗中改范围',()=>{
 assert.equal(registry.provinces.length,31);assert.equal(registry.cities.length,369);assert.equal(new Set(registry.cities.map(c=>c.id)).size,369);assert.equal(registry.cities.filter(c=>c.employee.status==='READY').length,283);assert.equal(registry.provinces.filter(p=>p.cities.some(c=>c.employee.status==='READY')).length,27);assert.equal(legacy.cities.length,40);assert.equal(residents.cities.length,369);
 for(const c of registry.cities.filter(c=>c.employee.status!=='READY')){assert.match(c.employee.reason,/暂未开放/);assert.match(c.employee.reason,/暂不提供金额/);assert.equal(c.employee.pensionBase,undefined);assert.throws(()=>forecast({...input('350100'),regionId:c.id}),/暂未开放/);}
 assert.equal(registry.capability('350100','flexible'),null);assert.throws(()=>forecast(input('350100',{contributionType:'FLEXIBLE'})),/开放/);
});
test('旧40城职工参数完整保留，浙江四川陕西扩省继承省规而非广州金额',()=>{
 for(const c of legacy.cities)assert.deepEqual(registry.capability(c.id),{...c.employee,policyProvinceId:c.provinceId});
 for(const [id,base]of [['330200',8537],['510300',8321],['610300',7881]])assert.equal(registry.capability(id).pensionBase,base);
});
test('新增年度参数、城市差异、年转月和指数工资分离，有独立数值参照',()=>{
 for(const [id,min,max,base,wage]of [['120100',5124,25620,9417,8540],['130100',4007,20034,7410,6678],['210100',4359,21792,8390,7264],['210200',4359,21792,8956,7264],['210300',4359,21792,7346,7264],['220100',4393.2,21966,95739/12,7322],['220200',4393.2,21966,87865/12,7322],['350100',4043,22607,7932,22607/3],['430100',4072,20361,7694,6787],['530100',4357,21789,8265,7263],['640100',4955,24774,8366,8258]]){
  const p=registry.capability(id);assert.equal(p.min,min);assert.equal(p.max,max);assert.equal(p.pensionBase,base);assert.equal(p.indexWage,wage);assert.equal(p.parameterStatus,'REFERENCE');assert.match(p.referenceLabel,/2025年参数参考/);
  const r=forecast(input(id)),s=r.scenarios.find(x=>x.plan==='CUSTOM');const divisor=policy.accountMonths[63];assert.equal(s.totalLow,new D(base).mul('.16').plus(new D(80000).div(divisor)).toFixed(2));assert.equal(s.futurePersonalCost,'0.00');
 }
 assert.match(profiles.profiles['220000'].referenceText,/农垦/);assert.equal(profiles.profiles['220000'].contributionEnd,'2026-06');assert.equal(profiles.profiles['130000'].sourceStatus,'GOVERNMENT_TEXT_REPRINT');
});
test('283地区均可用相同职工页面计算、改方案、修改和重填；未开放不回落广州',()=>{
 for(const c of registry.cities.filter(c=>c.employee.status==='READY')){const p=page();p.onLoad();p.regionChanged({detail:{regionId:c.id}});if(c.id==='440300')p.szScope({detail:{value:['yes']}});p.calculate();assert.equal(p.data.error,'',c.name);assert.equal(p.data.result.regionId,c.id);p.choosePlan({currentTarget:{dataset:{plan:'MINIMUM_STOP'}}});assert.equal(p.data.result.chosen.plan,'MINIMUM_STOP');p.edit();assert.equal(p.data.result,null);assert.equal(p.data.form.regionId,c.id);p.reset();assert.equal(p.data.form.regionId,c.id);}
 const p=page();p.onLoad();p.regionChanged({detail:{regionId:'540100'}});p.calculate();assert.equal(p.data.result,null);assert.match(p.data.baseError,/暂未开放/);p.regionChanged({detail:{regionId:'350100'}});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.regionId,'350100');
});
test('未来新增缴费按8%计算成本及入账，指数用工资而非计发基数，原有账户不被覆盖',()=>{
 for(const c of registry.cities.filter(c=>c.employee.employeeOnly)){const p=c.employee,r=forecast(input(c.id,{customMonths:12})),s=r.scenarios.find(x=>x.plan==='CUSTOM');assert.equal(s.futurePersonalCost,new D(p.min).mul('.08').mul(12).toFixed(2));assert.equal(s.account,new D(80000).plus(new D(p.min).mul('.08').mul(12)).toFixed(2));const index=new D('.6').mul(240).plus(new D(p.min).div(p.indexWage).mul(12)).div(252),basic=new D(p.pensionBase).mul(new D(1).plus(index)).div(2).mul(21).mul('.01');assert.equal(s.totalLow,basic.plus(new D(s.account).div(policy.accountMonths[63])).toFixed(2));}
});
test('职工新地区政策正文可复制且不串居民；未知地区无虚构金额来源',()=>{
 for(const id of ['120100','130100','210100','220100','350100','430100','530100','640100','330200','510300','610300']){const p=page('pages/policy/policy.js');p.onLoad({city:id,kind:'employee'});assert.equal(p.data.pending,'');assert.ok(p.data.documents.length>=2,id);assert.ok(p.data.documents.every(d=>d.kind==='employee'&&d.cityIds.includes(id)));}
 const p=page('pages/policy/policy.js');p.onLoad({city:'540100',kind:'employee'});assert.match(p.data.pending,/暂未开放/);assert.equal(p.data.documents.length,0);
});
test('职工省市选择沿用统一组件且按行政码排序，恢复天津不跳回广州；参数缓存过期失效',()=>{
 let def;const file=path.join(__dirname,'../miniprogram/components/region-picker/index.js');vm.runInNewContext(fs.readFileSync(file,'utf8'),{Component:x=>def=x,require:x=>require(path.resolve(path.dirname(file),x))});const c={...def.methods,data:{kind:'employee',value:'120100'},setData(patch){Object.assign(this.data,patch);}};c.sync();assert.equal(c.data.provinces.length,31);assert.equal(c.data.provinces[0],'北京市');assert.equal(c.data.provinces[1],'天津市');assert.equal(c.data.name,'天津市');assert.equal(c.data.pending,false);c.data.kind='flexible';c.data.value='440100';c.sync();assert.equal(c.data.provinces.length,7);
 const store={},p=page('pages/index/index.js',store);p.onLoad();p.regionChanged({detail:{regionId:'120100'}});p.calculate();const cost=p.data.result.chosen.futurePersonalCost;p.onHide();const q=page('pages/index/index.js',store);q.onLoad();assert.equal(q.data.form.regionId,'120100');assert.equal(q.data.result.chosen.futurePersonalCost,cost);store.employee.result.parameter.pensionBase=1;const stale=page('pages/index/index.js',store);stale.onLoad();assert.equal(stale.data.result,null);
});
test('全国账户查询提示不再一律导向粤省事，布局及输入控件未另开一套',()=>{
 const p=page();p.onLoad();p.regionChanged({detail:{regionId:'350100'}});p.accountHelp();assert.match(p.modals[0].content,/电子社保卡/);assert.doesNotMatch(p.modals[0].content,/粤省事/);
});
