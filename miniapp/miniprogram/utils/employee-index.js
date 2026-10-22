// The legacy Guangzhou calculator also accepts earlier record dates. Do not
// backdate the July 2026 wage reference into those older scenarios.
function referenceWage(local,asOf){
 if(!local)return null;
 if(!local.legacy)return local.indexWage;
 const m=String(asOf||'').match(/^(\d{4})-(\d{1,2})(?:-\d{2})?$/);
 return m&&Number(m[1])*12+Number(m[2])-1>=2026*12+6?local.indexWage:null;
}
function stale(result,local,asOf){
 return !!(result&&local&&(local.calculationVersion&&result.calculationVersion!==local.calculationVersion||(local.legacy||['GUANGDONG','SHENZHEN_NONLOCAL'].includes(local.rule))&&result.indexWage!==referenceWage(local,asOf)||local.employeeOnly&&(result.indexWage!==local.indexWage||result.parameter?.pensionBase!==local.pensionBase)));
}
module.exports={referenceWage,stale};
