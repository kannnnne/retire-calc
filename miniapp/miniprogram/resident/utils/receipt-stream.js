// Receipt offsets are zero-based months from the first pension payment.
// Only rules with verified effective-month timing may create future steps.
const D=require('../../vendor/decimal');
const localRules=require('../../utils/local-resident-policies');
function stages(policy,birth,first){
 if(!policy.ageExtraNextMonth)return {ageSteps:[],ageIncreaseSummary:''};
 let previous=localRules.ageExtra(policy,Math.floor((first-1-birth)/12));
 const ages=[...new Set([...(policy.age65Extra?[65]:[]),...(policy.ageExtras||[]).map(x=>x[0])])].sort((a,b)=>a-b),ageSteps=[];
 for(const age of ages){const offset=birth+age*12+1-first;if(offset<0)continue;const total=localRules.ageExtra(policy,age),delta=total-previous;if(delta>0)ageSteps.push({offset,delta,age});previous=total;}
 return {ageSteps,ageIncreaseSummary:ageSteps.map((s,i)=>s.age+'岁次月'+(i?'再':'起')+'加'+s.delta+'元/月').join('；')};
}
function cumulative(monthly,steps,months){
 let total=new D(monthly).mul(months);
 for(const step of steps||[])total=total.plus(new D(step.delta).mul(Math.max(0,months-step.offset)));
 return total;
}
function recovery(monthly,steps,cost){
 let remaining=new D(cost),rate=new D(monthly),start=0;
 if(remaining.lte(0))return 0;
 if(rate.lte(0))return null;
 for(const step of steps||[]){const length=step.offset-start,receipts=rate.mul(length);if(remaining.lte(receipts))return start+remaining.div(rate).ceil().toNumber();remaining=remaining.minus(receipts);rate=rate.plus(step.delta);start=step.offset;}
 return start+remaining.div(rate).ceil().toNumber();
}
module.exports={stages,cumulative,recovery};
