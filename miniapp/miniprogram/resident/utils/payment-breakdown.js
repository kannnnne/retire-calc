// Split displayed expenses by calendar year; never change the underlying plan.
const D=require('../../vendor/decimal');
function split(s,asOf){
 const year=Number(String(asOf).slice(0,4)),normal=(s.schedule||[]).filter(r=>String(r.type).startsWith('正常年缴')),current=normal.filter(r=>Number(r.year)===year),later=normal.filter(r=>Number(r.year)>year),cost=rows=>rows.reduce((v,r)=>v.plus(r.cost),new D(0)).toFixed(2);
 const history=String(s.immediateCost||'0.00'),currentCost=cost(current);
 return {year,historyCost:history,currentCost,nowCost:new D(history).plus(currentCost).toFixed(2),laterCost:cost(later),laterYears:later.reduce((n,r)=>n+Number(r.years||1),0),laterAnnual:s.annualTotal||s.annual,laterFirstYear:later.length?later[0].year:null,laterLastYear:later.length?later[later.length-1].year:null};
}
module.exports={split};
