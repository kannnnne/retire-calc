// Only offer extra normal annual payments where a verified local rule enables them.
function month(value){const m=String(value||'').match(/^(\d{4})-(\d{2})$/);return m&&+m[2]>=1&&+m[2]<=12?+m[1]*12+(+m[2]-1):null;}
function continuation(policy,f){
 const birth=month(f.birth),asOf=month(f.asOf),years=Number(f.years);
 if(!policy||!policy.continueTo60||birth===null||asOf===null||!/^\d+$/.test(String(f.years))||years<0||!['yes','no'].includes(f.paidThisYear))return {available:false,normalYears:0};
 const age=Math.floor((asOf-birth)/12);if(age<16||age>=60)return {available:false,normalYears:0};
 const firstYear=Math.floor(asOf/12)+(f.paidThisYear==='yes'?1:0),firstMonth=Math.max(asOf,firstYear*12+(policy.annualMonth?policy.annualMonth-1:asOf%12));
 const normalYears=Math.max(0,Math.ceil((birth+720-firstMonth)/12));
 return {available:normalYears>Math.max(0,15-years),normalYears};
}
module.exports={continuation};
