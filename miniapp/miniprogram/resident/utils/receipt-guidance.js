// A payment schedule is not a statutory retirement age or a decision on make-up eligibility.
function guidance(result){
 const s=result&&result.chosen,t=s&&s.timeline;
 if(!t||t.receivingAge<=60||!t.normalYears||s.lumpYears||result.makeup||result.transition||result.approvedPlan)return null;
 return {label:'逐年缴费方案',text:t.receivingAge+'岁是本方案缴满后的起领时间，不是当地规定的领取年龄。',planName:'逐年缴费方案 · 未计历史补缴'};
}
module.exports={guidance};
