const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/employee-registry');
const {forecast}=require('../miniprogram/utils/forecast');
const documents=require('../miniprogram/utils/city-documents');
const input=(id,patch={})=>({regionId:id,birthMonth:'1980-06',firstInsuredMonth:'1998-07',dataAsOf:'2026-09',paidMonths:339,principal:80000,interest:0,currentBase:registry.capability(id).min,historicalIndex:'0.6',contributionType:'EMPLOYEE',pauseMonths:0,customMonths:0,plan:'CUSTOM',category:'MALE',historicalRights:false,...patch});
test('重庆与湖北两市采用各自历史参考，缴费范围、指数工资和待遇不互相代用',()=>{
 for(const [id,min,max,base,wage,status]of [
  ['500100',4404,22017,8160,7338.75,'PUBLIC_NOTICE_REPRINT'],
  ['420100',4498,22488,8880,7496,'GOVERNMENT_CASE_REFERENCE'],
  ['420800',4299,21678,6957,7226,'GOVERNMENT_MEDIA_REPORT']]){
  const p=registry.capability(id);assert.equal(p.status,'READY');assert.equal(p.min,min);assert.equal(p.max,max);assert.equal(p.pensionBase,base);assert.equal(p.indexWage,wage);assert.equal(p.sourceStatus,status);
  assert.equal(p.year,2024);assert.equal(p.contributionYear,2025);assert.match(p.referenceLabel,/2024/);assert.match(p.referenceLabel,/2025/);
  const r=forecast(input(id));assert.equal(r.parameter.status,'REFERENCE');assert.equal(r.parameter.year,2024);assert.match(r.referenceNote,/2024/);assert.match(r.referenceNote,/2025/);
 }
 assert.match(registry.capability('420100').referenceText,/非该年最终标准/);
});
test('荆门发布30年指数0.8的独立示例：基础养老金1878.39元，不能套武汉8880',()=>{
 const r=forecast(input('420800',{historicalIndex:'0.8',currentBase:5780.8,customMonths:21}));
 const s=r.scenarios.find(s=>s.plan==='CUSTOM');assert.equal(s.totalMonths,360);assert.equal(s.index,'0.8000');assert.equal(s.basic,'1878.39');
});
test('重庆历史平均指数超过3要求核对，未来300%取整不能突破指数上限',()=>{
 assert.throws(()=>forecast(input('500100',{historicalIndex:'3.0001'})),/平均缴费指数超出范围/);
 const r=forecast(input('500100',{historicalIndex:'3',paidMonths:240,currentBase:22017,customMonths:120}));
 const s=r.scenarios.find(s=>s.plan==='CUSTOM');assert.equal(s.index,'3.0000');assert.equal(s.basic,'4896.00');assert.equal(s.futurePersonalCost,'211363.20');assert.equal(s.account,'291363.20');
 // The cap is local; other existing ordinary profiles retain their validation boundary.
 assert.doesNotThrow(()=>forecast(input('320100',{historicalIndex:'3.0001'})));
});
test('湖北只开放已核两市，其余15项无金额参数，灵活就业不被扩大',()=>{
 const p=registry.provinces.find(p=>p.id==='420000');assert.deepEqual(p.cities.filter(c=>c.employee.status==='READY').map(c=>c.id),['420100','420800']);
 for(const c of p.cities.filter(c=>c.employee.status!=='READY')){assert.equal(c.employee.min,undefined);assert.equal(c.employee.pensionBase,undefined);assert.throws(()=>forecast({...input('420100'),regionId:c.id}),/不能套其他城市标准/);}
 for(const id of ['500100','420100','420800']){assert.equal(registry.capability(id,'flexible'),null);assert.throws(()=>forecast(input(id,{contributionType:'FLEXIBLE'})),/开放/);}
});
test('新增城市政策正文只出现在本市职工资料里，武汉案例与荆门数值不串市',()=>{
 const wh=documents.find(d=>d.id==='wuhan-employee-case-2024'),jm=documents.find(d=>d.id==='jingmen-employee-base-2024');
 assert.deepEqual(wh.cityIds,['420100']);assert.deepEqual(jm.cityIds,['420800']);assert.equal(wh.kind,'employee');assert.equal(jm.kind,'employee');assert.match(wh.sections[0].text,/不宣称8880是2024最终年度标准/);
 for(const id of ['500100','420100','420800'])assert.ok(documents.filter(d=>d.kind==='employee'&&d.cityIds.includes(id)).length>=3);
});
