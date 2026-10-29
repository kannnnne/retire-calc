// Recover cumulative out-of-pocket contributions after pension receipt starts.
const D=require('../../vendor/decimal');
function display(result,scenario=result.chosen){
 const past=result.pastPaid,monthly=Math.round((Number(scenario.low)+Number(scenario.high))/20)*10;
 if(past==null||!Number.isFinite(Number(past))||Number(past)<0)return {known:false,text:'历史金额待补',detail:'回本要用自己实际交的钱计算。账户余额还含补贴、利息，不能当作历史缴费额。请在修改信息中改用历史缴费记录计算。'};
 const total=new D(past).plus(scenario.total),months=total.isZero()?0:monthly>0?total.div(monthly).ceil().toNumber():null;
 if(months===null)return {known:false,text:'暂无法计算',detail:'每月领取金额不足，暂无法计算回本时间。'};
 const years=Math.floor(months/12),remainder=months%12,text=months?'约'+(years?years+'年':'')+(remainder?remainder+'个月':''):'无需回本';
 return {known:true,text,months,total:total.toFixed(2),monthly,detail:'以前已交'+new D(past).toFixed(2)+'元＋还需交'+new D(scenario.total).toFixed(2)+'元＝累计自费'+total.toFixed(2)+'元。按页面每月约领'+monthly+'元计算，需领取'+months+'个月（'+text+'）。从开始领养老金起算，不含等待领取的时间；按整月向上取整，未计利息和今后待遇调整。政府补贴不算自己交的钱，自费集体档及家人资助计入费用。'};
}
module.exports={display};
