// Presentation only: minimum eligibility and a plan's actual duration are different.
function duration(months){const n=Number(months);return Number.isInteger(n)&&n>=0?(Math.floor(n/12)?Math.floor(n/12)+'年':'')+(n%12?n%12+'个月':'')||(n===0?'0个月':'—'):'—';}
function ageAt(birth,at){if(!/^\d{4}-\d{2}$/.test(birth||'')||!/^\d{4}-\d{2}$/.test(at||''))return '';const [by,bm]=birth.split('-').map(Number),[y,m]=at.split('-').map(Number),n=(y-by)*12+m-bm;return n>=0?Math.floor(n/12)+'岁':'';}
function amount(value){const n=Number(value);return Number.isFinite(n)?n.toLocaleString('en-US',{minimumFractionDigits:Number.isInteger(n)?0:2,maximumFractionDigits:2}):'—';}
function summary(s,birth,retirementMonth){
 const endAge=ageAt(birth,s.lastPaymentMonth),retirementAge=ageAt(birth,retirementMonth),future=Number(s.futureMonths),total=duration(s.totalMonths),minimum=duration(s.minimumMonths);
 let planName=s.name||'';
 if(future===0)planName=s.qualified?'已交够年限，无需再交':'本方案不再缴费';
 else if(s.plan==='MINIMUM_STOP')planName='交够'+minimum+'后停缴';
 else if(['CURRENT','MINIMUM'].includes(s.plan))planName=(s.plan==='MINIMUM'?'按最低档':'按此金额')+(s.lastPaymentMonth>retirementMonth?'交到'+endAge:'交到退休'+(retirementAge?'（'+retirementAge+'）':''));
 else if(s.plan==='CUSTOM')planName='继续交'+duration(future);
 return {totalDuration:total,minimumDuration:minimum,remainingDuration:duration(future),paymentText:amount(s.monthlyPersonalPayment),costText:amount(s.futurePersonalCost),paymentEnd:future>0?s.lastPaymentMonth+(endAge?'（'+endAge+'）':''):'无需再交',planName};
}
module.exports={duration,ageAt,summary};
