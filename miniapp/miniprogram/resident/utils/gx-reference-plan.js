// Isolated cost illustrations only. Never returns an applicable form or approval.
const D=require('../../vendor/decimal'),{calculate}=require('./calculate'),{projectionInput}=require('./payment-experience'),planner=require('./history-planner'),{tiersForYear}=require('./gx-makeup');
function build(original,p){
 if(p.rule!=='GUANGXI_ORDINARY'||original.never||original.receiving==='yes')throw Error('这页用于已经交过费、还没领取的人先比较费用');
 if(original.approvedPlan||original.gxTransitionEnabled==='yes'||(original.gxMakeupRows||[]).length)throw Error('已有补缴方案，请先返回原方案核对记录');
 const f=JSON.parse(JSON.stringify(original)),rough=!!f.historyUncertain;
 if(rough){f.years=f.roughYearsMin;f.pastAnnual=f.roughAnnualMin;f.historyMode='simple';f.accountMode='estimate';f.balance='';f.pastMonthly=false;
  for(const [lo,hi,label]of [[f.roughYearsMin,f.roughYearsMax,'年数'],[f.roughAnnualMin,f.roughAnnualMax,'金额']])if(!/^\d+(\.\d{1,2})?$/.test(String(lo))||!/^\d+(\.\d{1,2})?$/.test(String(hi))||Number(lo)<=0||Number(hi)<Number(lo))throw Error('请核对记得的缴费'+label+'范围');
  if(!/^\d+$/.test(String(f.roughYearsMin))||!/^\d+$/.test(String(f.roughYearsMax))||Number(f.roughYearsMax)>55||Number(f.roughYearsMax)-Number(f.roughYearsMin)>10||Number(f.roughAnnualMax)>100000)throw Error('请核对记得的年数和金额范围');
 }
 if(f.historyMode==='segments')throw Error('已填分年记录，请按实际记录比较补缴');
 if(f.pastMonthly){if(!/^\d+(\.\d{1,2})?$/.test(String(f.pastAnnual)))throw Error('请核对以前每月交的金额');f.pastAnnual=new D(f.pastAnnual).mul(12).toFixed(2);f.pastMonthly=false;}
 const asYear=Number(f.asOf.slice(0,4)),currentAssumed=!['yes','no'].includes(f.paidThisYear);if(currentAssumed)f.paidThisYear='yes';
 if(f.ageOnly)f.birth=String(asYear-Number(f.age))+f.asOf.slice(4);
 f.historyUncertain=false;f.payUntil='MINIMUM';f.gxTransitionEnabled='no';f.approvedPlan=null;f.gxMakeupRows=[];
 const base=calculate(projectionInput(f)),count=Number(f.years),paid=new Set(),start=Math.max(Number(f.gxStartYear||2012),p.gxSchemeYear||2012,Number(f.birth.slice(0,4))+16);
 for(let y=f.paidThisYear==='yes'?asYear:asYear-1;paid.size<count&&y>=start;y--)paid.add(y);
 if(paid.size!==count)throw Error('记得的年数超出当前可用范围，先按实际记录核对');
 f.gxStartYear=String(start);const {needed}=planner.minimumMissing(f,p),available=[];
 for(let y=asYear-1;y>=start;y--)if(!paid.has(y))available.push(y);
 // If insufficient calendar years exist, compare future payments without inventing gaps.
 const canIllustrate=available.length>=needed,missing=canIllustrate?available.slice(0,needed):[],options=[];
 for(const tier of p.tiers.filter(v=>[200,500,1000,2000,3000,6000].includes(v))){
  const rows=missing.map(year=>{const allowed=tiersForYear(year).filter(v=>v<=tier);return {mode:'missing',start:String(year),end:String(year),target:allowed[allowed.length-1]};});
  const r=calculate(projectionInput({...f,tier,accountMode:'balance',balance:base.openingAmount,historyMode:'simple',gxMakeupRows:rows,gxScopeReviewed:'yes'})),s=r.chosen;
  options.push({tier,monthly:Math.round(Number(s.low)/10)*10,receipt:s.receiptMonth||String(s.receiptYear),immediate:s.immediateCost||'0.00',total:s.total,normalYears:s.timeline.normalYears,firstYear:s.timeline.firstYear,lastYear:s.timeline.lastYear,future:s.timeline.normalCost,added:missing.length,upgraded:0});
 }
 return {referenceOnly:true,options,tier:options.some(x=>x.tier===Number(original.tier))?Number(original.tier):options[0].tier,assumption:'先按已交'+count+'年、'+(f.accountMode==='balance'?'账户'+base.openingAmount+'元':'每年'+f.pastAnnual+'元')+'看'+(currentAssumed?'；今年先按已含。':'。'),reason:'以前各年的档次没核清，这里先不算提高旧档。查清后可以再比。',note:canIllustrate&&needed?'假设漏缴的年份可以补，按近期已缴年份推定；只补没交的年，不提高以前的档。':canIllustrate?'以前交的钱不变，只比较以后每年交的档次。':'当前年份不足以安排补漏，先比较以后每年交的档次。',currentAssumed,rough,opening:base.openingAmount};
}
module.exports={build};
