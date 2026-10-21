// User-reported local annual amounts are references, never a declaration of legal tiers.
function reported(policy){return policy.annualInput&&policy.annualInput.kind==='LOCAL_CONFIRMED';}
function validate(policy,form){
 const annual=Number(form.tier);
 if(reported(policy)){
  // Technical input bound only; legal limits remain local and must be checked by the user.
  if(!/^\d+$/.test(String(form.tier))||annual<1||annual>100000)throw Error('请填写当地缴费页面可选的每年金额（整数元）');
  if(form.localAnnualConfirmed!=='yes')throw Error('请确认这个年缴金额在当地可以选择');
 }
 return annual;
}
module.exports={reported,validate};
