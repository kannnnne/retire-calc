const D=require('../../vendor/decimal');
const local=require('../../utils/local-resident-policies');
// Scope selection for a non-binding annual projection, not approval of benefits
// or make-up eligibility. The underlying calculators retain their strict gates.
function projectionInput(form){
 if(form.receiving==='yes')throw Error('你已经在领取养老金。这页用于开始领取前安排缴费，不能用来计算已领取后的调整。');
 return {...form,eligible:'yes',ordinary:form.gxTransitionEnabled==='yes'?form.ordinary:'yes'};
}
// A visibly conditional cost illustration. No invented historical records,
// no government grant, no changes to the user's confirmation or active result.
function illustration(form,result,policy){
 if(!result||result.makeup||policy.rule!=='GUANGXI_ORDINARY')return null;
 const paid=Number(form.years);if(!Number.isInteger(paid)||paid<0||!Number.isInteger(result.age)||!/^\d+(\.\d{1,2})?$/.test(String(result.openingAmount)))return null;
 const missing=Math.max(0,15-paid);if(!missing)return null;
 if(result.age-15<15)return {limited:true,note:'你目前可能参保的年份还不足15年，不能把缺的年数都当成以前漏交。先按每年缴费安排。'};
 const annual=200,cost=new D(annual).mul(missing),age=Math.max(60,result.age),account=new D(result.openingAmount).plus(cost);
 const base=new D(policy.base).plus(local.ageExtra(policy,age));
 return {limited:false,years:missing,annual,cost:cost.toFixed(0),age,monthly:String(Math.round(base.plus(account.div(139)).div(10).toNumber())*10),note:'仅假设这'+missing+'个年份都允许按每年200元补缴，未加补贴和利息；不代表已经符合补缴条件。'};
}
module.exports={projectionInput,illustration};
