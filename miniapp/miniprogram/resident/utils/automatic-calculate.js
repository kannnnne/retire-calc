const raw=require('./calculate');
const VERSION='AUTO_MAKEUP_V1';
function calculate(form){
 // The tool assumes applicable handling conditions for a scenario; no approval is recorded.
 const explicit=!!(form.makeupStrategy==='ANNUAL_ONLY'||form.approvedPlan||form.gxTransitionEnabled==='yes'||(form.gxMakeupRows||[]).length);
 const f=explicit?{...form}:{...form,autoMakeup:'yes',eligible:'yes',ordinary:'yes',localAnnualConfirmed:'yes',extended:'yes',transition:'no'};
 const result=raw.calculate(f);result.calculationVersion=VERSION;
 if(result.autoPlan)result.warnings.unshift(result.autoPlan.summary+'本次按符合办理条件测算，不增加已缴记录。');
 return result;
}
module.exports={calculate,VERSION};
