// Audit real default Page flows; late receipt is a review candidate, not proof of a policy bug.
const fs=require('node:fs'),path=require('node:path');
const registry=require('../miniprogram/utils/resident-registry'),rules=require('../miniprogram/utils/resident-makeup-policies');
const {page}=require('./resident-module-harness');
const rows=[];
for(const province of registry.provinces)for(const city of province.cities){
 const rule=rules.get(city.id,city.resident.rule),cases=[];
 for(const age of [55,60,65]){
  const q=page('basic');q.onLoad();q.regionChoice({detail:{regionId:city.id}});
  q.setData({'form.age':String(age),'form.asOf':'2026-10',...(city.resident.annualInput?{'form.tier':500}:{})});q.calculate();
  const r=q.data.result,s=r?.chosen;
  cases.push({age,error:s?null:q.data.error||'no result',receivingAge:s?.timeline?.receivingAge,receiptMonth:s?.receiptMonth,autoPlan:r?.autoPlan?.title||null,lumpYears:s?.lumpYears||0,makeupYears:r?.makeup?.addedYears||0});
 }
 rows.push({province:province.name,id:city.id,name:city.name,policyRule:city.resident.rule,modes:rule?.modes||[],referenceMode:rule?.referenceMode||null,validThrough:rule?.validThrough||null,cases});
}
const grouped={};for(const row of rows){const key=[row.province,row.policyRule,row.modes.join(','),row.referenceMode,row.cases.map(c=>c.error?'ERROR':c.receivingAge).join('/')].join('|');(grouped[key]||=([])).push(row);}
const groups=Object.values(grouped).map(list=>({province:list[0].province,rule:list[0].policyRule,modes:list[0].modes,referenceMode:list[0].referenceMode,count:list.length,example:list[0].name,id:list[0].id,ages:list[0].cases.map(c=>c.error?'ERROR':c.receivingAge).join('/'),errors:list[0].cases.filter(c=>c.error).map(c=>c.error)}));
const report={asOf:'2026-10',note:'Zero paid years; ages 55/60/65; 500 annual input where local price is unspecified. Late receipt flags review, not a finding that makeup is legally unavailable.',regions:rows.length,caseCount:rows.length*3,errorCases:rows.flatMap(r=>r.cases).filter(c=>c.error).length,groups,rows};
fs.mkdirSync(path.join(__dirname,'../output'),{recursive:true});fs.writeFileSync(path.join(__dirname,'../output/default-makeup-audit.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,rows:undefined},null,2));
