const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies');
const {forecast}=require('../miniprogram/utils/forecast');
const categories=require('../miniprogram/utils/flexible-category');
const form=(id,patch={})=>({regionId:id,birthMonth:'1985-06',firstInsuredMonth:'2010-07',dataAsOf:'2026-10',paidMonths:180,principal:'80000',currentBase:String(registry.city(id).employee.min||5521),category:'FEMALE_55',historicalIndex:'0.6',plan:'CURRENT',contributionType:'FLEXIBLE',szScopeConfirmed:'yes',pastEmployeeMonths:0,...patch});

test('广东21市纯灵活女性不得按原50岁算，曾有单位记录仍保留岗位类别选择',()=>{
 for(const c of registry.cities.filter(c=>c.provinceId==='440000')){
  assert.deepEqual(categories.options(c.id,0).values,['MALE','FEMALE_55']);assert.deepEqual(categories.options(c.id,12).values,['MALE','FEMALE_55','FEMALE_50']);
  const f=form(c.id);assert.throws(()=>forecast({...f,category:'FEMALE_50'}),/一直自己交/);
  assert.throws(()=>forecast({...f,category:'FEMALE_50',pastEmployeeMonths:undefined}),/单位职工参保记录/);
  const pure=forecast(f);assert.equal(pure.retirement.month,'2043-06');assert.equal(pure.contributionType,'FLEXIBLE');
  const former=forecast({...f,category:'FEMALE_50',pastEmployeeMonths:12});assert.equal(former.retirement.month,'2040-06');
  assert.throws(()=>forecast({...f,category:'FEMALE_50',pastEmployeeMonths:181}),/单位参保经历/);
 }
});

test('广西14市申领时仍灵活就业的女性不按广东单位历史规则选原50岁',()=>{
 for(const c of registry.cities.filter(c=>c.provinceId==='450000')){
  for(const unit of [0,12,180]){
   assert.deepEqual(categories.options(c.id,unit).values,['MALE','FEMALE_55']);
   assert.throws(()=>forecast(form(c.id,{category:'FEMALE_50',pastEmployeeMonths:unit})),/广西退休时仍以灵活就业身份/);
   assert.equal(forecast(form(c.id,{pastEmployeeMonths:unit})).retirement.month,'2043-06');
  }
  assert.equal(forecast(form(c.id,{category:'FEMALE_50',contributionType:'EMPLOYEE'})).retirement.month,'2040-06');
 }
});

test('类别校验不把原55岁误作固定55岁，也不把限制套给男性或外省',()=>{
 for(const id of ['440100','440700','450100','451400']){
  const male=forecast(form(id,{category:'MALE'}));assert.equal(male.retirement.month,'2048-06');
  for(const unit of [-1,NaN,Infinity,'12',1.5])assert.throws(()=>categories.validate('440100','FEMALE_50',unit,180),/单位参保经历/);
 }
 for(const c of registry.cities.filter(c=>!['440000','450000'].includes(c.provinceId)))assert.deepEqual(categories.options(c.id,0).values,['MALE','FEMALE_55','FEMALE_50']);
});

test('省级类别来源覆盖35市职工与灵活入口但不串居民和外省，不冒称广西通知原件',()=>{
 for(const c of registry.cities){
  for(const [province,id]of [['440000','gd-flex-female-category-2024'],['450000','gx-flex-female-category-2021']]){
   const matches=c.employee.sources.filter(s=>s.id===id);assert.equal(matches.length,c.provinceId===province?1:0);
   assert.ok(!c.resident.sources.some(s=>s.id===id));if(matches.length){assert.equal(matches[0].checkedAt,'2026-10-19');assert.equal(registry.capability(c.id,'flexible'),c.employee);}
  }
 }
 const gx=registry.city('450100').employee.sources.find(s=>s.id==='gx-flex-female-category-2021');assert.equal(gx.publisher,'广西壮族自治区人力资源和社会保障厅');assert.match(gx.url,/t10218731/);
});
