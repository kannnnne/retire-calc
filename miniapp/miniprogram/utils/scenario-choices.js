// Collapse financially identical choices without changing the engine's scenarios.
function choices(scenarios,selected){const map=new Map();for(const s of scenarios||[]){const key=JSON.stringify([s.qualified,s.unsupported,s.error,s.totalLow,s.totalHigh,s.monthlyPersonalPayment,s.futureMonths,s.futurePersonalCost,s.receiptMonth,s.lastPaymentMonth]);if(!map.has(key)||s.plan===selected)map.set(key,s);}return [...map.values()];}
module.exports={choices};
