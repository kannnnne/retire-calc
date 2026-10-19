const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies');
const documents=require('../miniprogram/utils/city-documents');
const {forecast}=require('../miniprogram/utils/forecast');
const gx=registry.cities.filter(c=>c.provinceId==='450000');
const form=(regionId,patch={})=>({regionId,birthMonth:'1985-06',firstInsuredMonth:'2006-07',dataAsOf:'2026-10',paidMonths:180,principal:'80000.01',currentBase:'4204.8',category:'FEMALE_55',historicalIndex:'0.6',plan:'CURRENT',contributionType:'FLEXIBLE',...patch});

test('广西14市职工与灵活共用四份已取得原件，剔除无须展示的参数转载',()=>{
 assert.equal(gx.length,14);
 const ids=['gx-2026-range','gx-2025-base','gx-employee-rule','gx-flex-female-category-2021'];
 for(const id of ids){
  const d=documents.find(d=>d.id===id&&d.kind==='employee');assert.ok(d,id);assert.equal(d.cityIds.length,14);assert.match(d.url,/^http:\/\/rst\.gxzf\.gov\.cn\//);
  for(const c of registry.cities){const p=registry.capability(c.id,'employee'),s=p.sources.find(s=>s.id===id);if(c.provinceId==='450000'){assert.ok(s,c.name);assert.equal(s.checkedAt,'2026-10-19');assert.match(s.publisher,/广西壮族自治区/);}else assert.equal(s,undefined,c.name);assert.equal(c.resident.sources.some(s=>s.id===id),false,c.name);}
 }
 assert.equal(documents.some(d=>['gx-range-reprint','gx-base-reprint'].includes(d.id)),false);
 for(const c of gx){assert.equal(c.employee.pensionBase,6983);assert.equal(c.employee.year,2025);assert.equal(c.employee.min,4204.8);assert.equal(c.employee.max,21024);}
});

test('广西14市月养老金合计见分进角；独立算例覆盖整月、零头年限和自定义续缴',()=>{
 // Independent decimal calculation: index rounded to 4 places, years rounded up to 2,
 // basic + full account / 152, then final total rounded up to 0.1 yuan.
 const cases=[{paidMonths:180,future:200,want:'2739.40'},{paidMonths:181,future:200,want:'2743.90'},{paidMonths:240,future:24,plan:'CUSTOM',customMonths:24,want:'1808.60'}];
 for(const c of gx)for(const row of cases)for(const contributionType of ['EMPLOYEE','FLEXIBLE']){
  const r=forecast(form(c.id,{...row,contributionType})),s=r.scenarios.find(s=>s.plan===(row.plan||'CURRENT'));
  assert.equal(r.retirement.month,'2043-06');assert.equal(s.futureMonths,row.future,c.name);assert.equal(s.totalLow,row.want,c.name);assert.equal(s.totalHigh,row.want,c.name);assert.equal(s.qualified,true);
  assert.equal(s.futureAccountCredit,(4204.8*.08*row.future).toFixed(2));assert.equal(s.futurePersonalCost,(4204.8*(contributionType==='EMPLOYEE'?.08:.2)*row.future).toFixed(2));
 }
});

test('广西取位不扩大女性年龄与补缴范围，也不把规则施加给广东',()=>{
 for(const c of gx){assert.throws(()=>forecast(form(c.id,{category:'FEMALE_50'})),/广西退休时仍以灵活就业身份/);const s=forecast(form(c.id,{plan:'CUSTOM',customMonths:1})).scenarios.find(s=>s.plan==='CUSTOM');assert.equal(s.qualified,false);assert.equal(s.totalLow,null);assert.equal(s.totalHigh,null);}
 const r=forecast(form('440100',{currentBase:'5521'}));assert.ok(r.scenarios.some(s=>s.totalLow&&Number(s.totalLow)*10%1!==0),'广东金额不按广西规则进角');
});
