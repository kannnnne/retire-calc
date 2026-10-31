// Compare pension receipts with known out-of-pocket costs, without blocking on old records.
const D=require('../../vendor/decimal');
const receipts=require('./receipt-stream');
function display(result,scenario=result.chosen){
 const past=result.pastPaid,historyKnown=past!=null&&String(past).trim()!==''&&Number.isFinite(Number(past))&&Number(past)>=0;
 const scope=historyKnown?'all':'future',label=historyKnown?'全部缴费回本':'后续缴费回本';
 const monthly=Math.round((Number(scenario.low)+Number(scenario.high))/20)*10;
 const future=new D(scenario.total),total=historyKnown?new D(past).plus(future):future;
 const money=v=>v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,','),costs={futureAmount:money(future),totalAmount:money(total),totalLabel:historyKnown?'前后总共交':'本次合计',totalNote:historyKnown?'':'未含以前缴费'};
 const months=receipts.recovery(monthly,scenario.ageSteps,total);
 if(months===null)return {...costs,known:false,scope,label,text:'暂无法计算',detail:'每月领取金额不足，暂无法计算回本时间。'};
 const years=Math.floor(months/12),remainder=months%12,text=months?'约'+(years?years+'年':'')+(remainder?remainder+'个月':''):historyKnown?'无需回本':'无需再交';
 const basis=historyKnown?'以前已交'+new D(past).toFixed(2)+'元＋还需交'+future.toFixed(2)+'元＝累计自费'+total.toFixed(2)+'元。':'只算从现在起还需交的'+future.toFixed(2)+'元，含补缴和以后缴费。以前交的钱未计入，也不用补填；账户余额不当作自己交过的钱。';
 return {...costs,known:true,scope,label,text,months,total:total.toFixed(2),monthly,detail:basis+'按页面每月约领'+monthly+'元'+(scenario.ageSteps&&scenario.ageSteps.length?'及现行到龄加发分段计算':'计算')+'，需领取'+months+'个月（'+text+'）。从开始领养老金起算，不含等待领取的时间；按整月向上取整，未计领取后的账户利息和未来年度普调。这里用全部月领养老金抵回费用，不是新增养老金的增额回本。政府补贴不算自己交的钱，自费集体档及家人资助计入费用。'};
}
module.exports={display};
