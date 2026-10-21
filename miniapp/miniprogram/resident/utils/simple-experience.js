const experience=require('./payment-experience');
const integer=(v,label)=>{if(!/^\d+$/.test(String(v)))throw Error('请填写'+label);return Number(v);};
const money=(v,label)=>{if(!/^\d+(\.\d{1,2})?$/.test(String(v)))throw Error('请填写'+label);return Number(v);};
const span=(values)=>{const min=Math.min(...values),max=Math.max(...values);return min===max?String(min):min+'—'+max;};
const roundMonthly=v=>String(Math.round(Number(v)/10)*10);
function options(rows,selected,expanded){
 const byIncome=new Map();for(const row of rows)if(!byIncome.has(row.monthly)||row.annual===selected)byIncome.set(row.monthly,row);
 const all=[...byIncome.values()].sort((a,b)=>a.annual-b.annual);if(expanded||all.length<=4)return {rows:all,more:all.length>4};
 const picked=new Set([all[0],all[Math.floor((all.length-1)/2)],all[all.length-1],all.find(x=>x.annual===selected)].filter(Boolean));
 return {rows:[...picked].sort((a,b)=>a.annual-b.annual),more:true};
}
function calculate(form,engine){
 const f={...form},uncertain=!!f.historyUncertain&&!f.never;
 if((uncertain||f.paidThisYear==='unknown')&&(f.approvedPlan||(f.gxMakeupRows||[]).length||f.gxTransitionEnabled==='yes'))throw Error('加入补缴前，请先按查询记录填清已交年数、金额和今年是否已缴。现在可以先看大概或查看怎么查记录。');
 if(!uncertain&&f.paidThisYear!=='unknown')return engine(f);
 let years=[Number(f.years)],annuals=[Number(f.pastAnnual)];
 if(uncertain){
  if(f.accountMode!=='estimate'||f.historyMode==='segments'||f.pastMonthly)throw Error('记不清时先按每年交费估算；已有账户或分年记录，请改用“记得清”。');
  const lo=integer(f.roughYearsMin,'至少交过几年'),hi=integer(f.roughYearsMax,'最多交过几年'),a=money(f.roughAnnualMin,'以前每年大概最少交多少'),b=money(f.roughAnnualMax,'以前每年大概最多交多少');
  if(lo<1||hi<lo||hi-lo>10||hi>55)throw Error('请核对大概交过几年，前面的数要小些，最多相差10年');
  if(a<=0||b<a||b>100000)throw Error('请核对以前每年交的钱，前面的数要小些');
  years=[...new Set([lo,hi])];annuals=[...new Set([a,b])];
 }
 const detailed=f.historyMode==='segments'&&!uncertain,asYear=Number(String(f.asOf).slice(0,4)),paidChoices=f.paidThisYear==='unknown'?(detailed?[(f.segments||[]).some(s=>Number(s.start)<=asYear&&Number(s.end)>=asYear)?'yes':'no']:['no','yes']):[f.paidThisYear];
 const trials=[];for(const y of years)for(const annual of annuals)for(const paid of paidChoices){
  if(y===0&&paid==='yes')continue;
  const input={...f,historyUncertain:false,years:String(y),pastAnnual:String(annual),paidThisYear:paid};
  const result=engine(input);trials.push({input,result});
 }
 if(!trials.length)throw Error('请核对已交年数和今年缴费');
 // Keep a conservative existing-engine result; uncertainty never creates approved records.
 trials.sort((a,b)=>b.result.chosen.timeline.receivingAge-a.result.chosen.timeline.receivingAge||Number(b.result.chosen.total)-Number(a.result.chosen.total));
 const result=trials[0].result;
 result.uncertainty={history:uncertain,yearUnknown:f.paidThisYear==='unknown'&&!detailed,historyLabel:uncertain?'按已交'+span(years)+'年、每年'+span(annuals)+'元先看大概':detailed?'今年缴费按已填的分年记录计算':'今年是否已缴记不清，先看两种情况',trials:trials.map(t=>({years:Number(t.input.years),pastAnnual:t.input.pastAnnual,paidThisYear:t.input.paidThisYear,age:t.result.age,openingAmount:t.result.openingAmount,normalYears:t.result.chosen.timeline.normalYears,total:Number(t.result.chosen.total),monthly:Number(t.result.chosen.low),receivingAge:t.result.chosen.timeline.receivingAge,receiptYear:t.result.chosen.receiptYear}))};
 return result;
}
function overview(form,result,policy){
 if(!result||policy.rule!=='GUANGXI_ORDINARY'||result.transition||result.makeup||result.approvedPlan||result.paidYears>=15)return null;
 const s=result.chosen,t=result.uncertainty?.trials||[{years:result.paidYears,age:result.age,openingAmount:result.openingAmount,normalYears:s.timeline.normalYears,total:Number(s.total),monthly:Number(s.low),receivingAge:s.timeline.receivingAge,receiptYear:s.receiptYear}];
 const examples=t.map(x=>experience.illustration({...form,years:String(x.years)},{age:x.age,openingAmount:x.openingAmount},policy)).filter(x=>x&&!x.limited);
 return {historyLabel:result.uncertainty?.historyLabel||'按已交'+result.paidYears+'年计算',annual:s.annualTotal,years:span(t.map(x=>x.normalYears)),total:span(t.map(x=>x.total)),monthly:roundMonthly(Math.max(...t.map(x=>x.monthly))),age:span(t.map(x=>x.receivingAge)),year:span(t.map(x=>x.receiptYear)),canIllustrate:examples.length===t.length,makeupYears:examples.length?span(examples.map(x=>x.years)):'',makeupCost:examples.length?span(examples.map(x=>Number(x.cost))):'',makeupMonthly:examples.length?roundMonthly(Math.max(...examples.map(x=>Number(x.monthly)))):''};
}
const methods={
 openKnownRecords(){if(this.data.form.historyUncertain||this.data.form.paidThisYear==='unknown'){this.openRecordHelp();return;}this.openPaymentPlanner();},
 historyCertainty(e){const uncertain=e.currentTarget.dataset.value==='rough';this.setData({'form.historyUncertain':uncertain,...(uncertain?{'form.roughYearsMin':this.data.form.roughYearsMin??'3','form.roughYearsMax':this.data.form.roughYearsMax??'4','form.roughAnnualMin':this.data.form.roughAnnualMin??'300','form.roughAnnualMax':this.data.form.roughAnnualMax??'400','form.accountMode':'estimate','form.historyMode':'simple','form.pastMonthly':false,'form.balance':'','form.paidThisYear':'unknown','form.approvedPlan':null,'form.gxMakeupRows':[],'form.gxTransitionEnabled':'no','form.gxScopeReviewed':'unknown','form.gxTransitionReviewed':'unknown'}:this.data.form.historyUncertain?{'form.years':'','form.pastAnnual':''}:{}),routeDetail:false,result:null,error:''});},
 roughInput(e){const key=e.currentTarget.dataset.key;if(['roughYearsMin','roughYearsMax','roughAnnualMin','roughAnnualMax'].includes(key))this.setData({['form.'+key]:e.detail.value,result:null,error:''});},
 showOrdinaryRoute(){this.setData({routeDetail:true,routeOverview:null});this.scrollTop();},
 showRoutes(){this.setData({routeDetail:false});this.updatePlans();this.scrollTop();},
 moreFutureOptions(){this.setData({allFuturePlans:!this.data.allFuturePlans});this.updatePlans();},
 openRecordHelp(){this.setData({recordHelp:true,error:''});this.scrollTop();},
 closeRecordHelp(){this.setData({recordHelp:false});this.scrollTop();},
 recordsReady(){this.setData({...(this.data.form.historyUncertain?{'form.years':'','form.pastAnnual':''}:{}),recordHelp:false,planning:false,planReturn:null,gxPlanOpen:false,planRecords:false,result:null,routeDetail:false,more:false,'form.historyUncertain':false,'form.paidThisYear':'unknown',error:''});this.scrollTop();}
};
module.exports={calculate,overview,options,methods};
