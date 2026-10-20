const D=require('../../vendor/decimal');
function annual(policy,form){
 const value=form.socialAidAnnual==null||form.socialAidAnnual===''?0:form.socialAidAnnual;
 if(!/^\d+(\.\d{1,2})?$/.test(String(value)))throw Error('请填写有效的每年资助金额');
 const amount=new D(value);if(amount.isZero())return amount;
 if(!policy.socialAidCap)throw Error('本地区暂未开放社会资助计算，请先取消资助金额');
 if(amount.gt(policy.socialAidCap))throw Error('资助与集体补助每年合计不能超过'+policy.socialAidCap+'元');
 if(form.socialAidConfirmed!=='yes')throw Error('请先确认没有其他集体补助或社会资助，避免超出年度上限');
 return amount;
}
module.exports={annual};
