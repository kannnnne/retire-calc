const D=require('../../vendor/decimal'),rates=require('./interest-rates'),receipts=require('./receipt-stream');
const months=require('../../utils/policy-data').accountMonths;
const VERSION='RESIDENT_ACCOUNT_INTEREST_V1';
const serial=s=>{const m=String(s||'').match(/^(\d{4})-(0[1-9]|1[0-2])$/);if(!m)throw Error('请核对利息测算年月');return Number(m[1])*12+Number(m[2])-1;};
// Balance is already valued through asOf. New payments earn interest from next month.
// Interest accrues simply within each calendar year and compounds at year end.
function project(opening,events,asOf,end,percent){
 if(end<asOf)throw Error('起领月份不能早于账户截至月份');
 const rate=new D(percent).div(100),credits=new Map();let capital=new D(opening),earned=new D(0),accrued=new D(0);
 for(const e of events){const value=new D(e.amount);if(value.lt(0))throw Error('账户入账金额不能为负');if(e.month<asOf||e.month>end)throw Error('缴费入账月份超出测算期间');credits.set(e.month,(credits.get(e.month)||new D(0)).plus(value));}
 capital=capital.plus(credits.get(asOf)||0);
 for(let m=asOf+1;m<=end;m++){accrued=accrued.plus(capital.mul(rate).div(12));capital=capital.plus(credits.get(m)||0);if(m%12===11){const interest=accrued.toDecimalPlaces(2);capital=capital.plus(interest);earned=earned.plus(interest);accrued=new D(0);}}
 const tail=accrued.toDecimalPlaces(2);capital=capital.plus(tail);earned=earned.plus(tail);
 return {account:capital.toFixed(2),interest:earned.toFixed(2)};
}
function apply(result,form){
 if(result.interest?.version===VERSION)return result;
 const record=rates.get(form.regionId,form.asOf),enabled=form.interestMode!=='NONE'&&!!record;
 const label=enabled?'含利息 · 按'+record.year+'年利率'+record.percent.toFixed(2)+'%测算':form.interestMode==='NONE'?'未计未来账户利息':'未计账户利息 · 当地利率待核';
 const note=enabled?'账户从截至月份往后计息，按'+record.year+'年当地记账利率'+record.percent.toFixed(2)+'%固定测算；按缴费月份次月起计息、年末复利，未来实际利率可能变化。':form.interestMode==='NONE'?'本方案关闭未来账户利息测算，已有查询余额不变。':'当地居民养老记账利率尚未核实，暂不预测未来利息，不套用其他省或职工利率。';
 const clean=s=>s.replace('利息和未来普调未计入','未来普调未计入').replace('利息按0计算','账户利息另按所选口径测算');
 const base={...result,interest:{version:VERSION,status:enabled?'PROJECTED':form.interestMode==='NONE'?'OFF':'UNVERIFIED',record:record||null,label,note},warnings:[...(result.warnings||[]).map(clean),note],sources:[...new Map([...(result.sources||[]),...(record?[record.source]:[])].map(s=>[s.url,s])).values()]};
 if(!enabled)return base;
 const a=serial(form.asOf),b=serial(form.birth),p=require('../data/regions').getRegion(form.regionId,form.localArea),gz=form.regionId==='440100',cd=p.rule==='CHENGDU_REFERENCE';
 const scenarios=result.scenarios.map(s=>{
  const end=s.receiptMonth?serial(s.receiptMonth)-1:Math.max(a,b+720,s.lumpYears?serial(s.timeline.lumpMonth):(s.timeline.lastYear||Math.floor(a/12))*12+a%12);
  const atYear=y=>Math.max(a,Number(y)*12+(p.annualMonth?p.annualMonth-1:a%12));
  const events=(s.schedule||[]).map(row=>{const normal=row.type.startsWith('正常年缴'),month=normal?atYear(row.year):serial(s.timeline.lumpMonth);return {month,amount:cd?new D(row.cost).mul(normal?'.8':new D(2).div(3)):new D(row.cost).plus(row.subsidy||0)};});
  const scheduled=events.reduce((sum,e)=>sum.plus(e.amount),new D(0)),immediate=new D(s.account).minus(scheduled).minus(result.openingAmount||0);
  // The raw engine rounds its final balance; retain that rounding without creating money.
  const opening=D.max(0,new D(result.openingAmount||0).plus(immediate));if(new D(result.openingAmount||0).plus(immediate).lt(-.01))throw Error('账户金额与缴费明细不一致，请重新计算');
  const computed=project(opening,events,a,end,record.percent),account=new D(computed.account),age=s.timeline.receivingAge;
  const lowDivisor=gz?months[Math.max(60,age-1)]:p.rule==='BEIJING_ORDINARY'||cd||p.ageDivisor?months[Math.max(60,age)]:139;
  const highDivisor=gz?months[Math.min(70,age)]:lowDivisor;
  const low=account.div(lowDivisor).plus(s.base),high=account.div(highDivisor).plus(s.base),fast=receipts.recovery(high,s.ageSteps,s.total),slow=receipts.recovery(low,s.ageSteps,s.total);
  return {...s,account:computed.account,personalLow:account.div(lowDivisor).toFixed(2),personalHigh:account.div(highDivisor).toFixed(2),low:low.toFixed(2),high:high.toFixed(2),recoveryFast:fast,recoverySlow:slow,recoveryYearsFast:(fast/12).toFixed(1),recoveryYearsSlow:(slow/12).toFixed(1),interest:{amount:computed.interest,accountWithoutInterest:s.account,monthlyWithoutInterest:new D(s.low).plus(s.high).div(2).toFixed(2),monthlyIncrease:low.plus(high).minus(s.low).minus(s.high).div(2).toFixed(2)}};
 });
 const lowest=scenarios[0];for(const s of scenarios){const extra=new D(s.total).minus(lowest.total),delta=new D(s.low).minus(lowest.low);s.extra=extra.toFixed(2);s.delta=delta.toFixed(2);s.incrementalMonths=delta.gt(0)&&(!gz||s.receiptYear===lowest.receiptYear)?extra.div(delta).ceil().toNumber():null;}
 return {...base,scenarios,chosen:scenarios.find(s=>s.annual===result.chosen.annual)};
}
module.exports={VERSION,serial,project,apply};
