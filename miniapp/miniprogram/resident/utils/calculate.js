const D=require('../../vendor/decimal');
const {getRegion}=require('../data/regions');
const divisors={60:139,61:132,62:125,63:117,64:109,65:101,66:93,67:84,68:75,69:65,70:56};
function month(s,label){if(!/^\d{4}-\d{2}$/.test(s||'')||+s.slice(5)<1||+s.slice(5)>12)throw Error('请选择'+label);return +s.slice(0,4)*12+(+s.slice(5)-1);}
function money(v,label,blank=false){if(blank&&v==='')return null;if(!/^\d+(\.\d{1,2})?$/.test(String(v))||new D(v).gt(100000000))throw Error('请检查'+label);return new D(v);}
function calculate(f){
 if(f.regionId==='440100'&&f.gxMakeupRows&&f.gxMakeupRows.length)throw Error('本地区不能使用广西历史补缴方案，请清除补缴记录');
 if(f.regionId!=='440100')return require('./ordinary-calculate').calculate(f);
 const region=getRegion(f.regionId);if(!region||region.rule!=='GUANGZHOU_2021')throw Error('这个地区还没开放计算');
 const b=month(f.birth,'出生年月'),a=month(f.asOf,'数据截至月份'),age=Math.floor((a-b)/12);if(a<2025*12)throw Error('居民参考参数从2025年起使用，不支持更早截至月份');if(age<16||age>70)throw Error('本版支持16至70岁普通参保情况');
 if(f.eligible!=='yes')throw Error('请先确认本市居民参保资格；特殊或不确定情况需经办机构核对');
 const years=Number(f.years);if(!/^\d+$/.test(String(f.years))||years<0||years>Math.min(60,age-15))throw Error('请核对累计已缴年限（完整年）');
 const balance=money(f.balance,'账户储存额',true),past=money(f.pastAnnual,'历史年缴金额',true),budget=money(f.budget,'一次预算',true);
 if(!f.never&&years<15&&b<=1967*12+7&&f.transition!=='no')throw Error('可能涉及2012年历史过渡办法，请先向街镇核对；确认走普通办法后，勾选表单下方对应选项');
 if(f.never&&years!==0)throw Error('从未参保的已缴年限应为0');if(f.never&&balance&&!balance.isZero())throw Error('从未参保时账户金额应为0');
 if(!balance&&years>0&&!past&&f.historyMode!=='segments')throw Error('账户余额未知时，请填大致历史年缴金额，以便给出保守参考');
 if(f.never&&f.paidThisYear==='yes')throw Error('从未参保不能选择今年已缴');
 let historical=new D(f.never?0:past||0).mul(years);
 if(f.historyMode==='segments'){
   if(f.never)throw Error('从未参保无需历史记录');
   const seen=new Set();let n=0;historical=new D(0);
   for(const row of f.segments||[]){const start=Number(row.start),end=Number(row.end);if(!/^\d{4}$/.test(row.start)||!/^\d{4}$/.test(row.end)||start>end||end>Math.floor(a/12)||start<Math.floor(b/12)+16)throw Error('请核对历史阶段起止年份');const annual=money(row.annual,'阶段年缴金额');for(let y=start;y<=end;y++){if(seen.has(y))throw Error('历史缴费阶段不能重叠');seen.add(y);n++;historical=historical.plus(annual);}}
   if(n!==years)throw Error('历史阶段合计'+n+'年，与填写的已缴'+years+'年不一致');
   if((f.paidThisYear==='yes')!==seen.has(Math.floor(a/12)))throw Error('今年缴费选择与历史阶段不一致');
 }
 const opening=balance||historical,estimated=!balance&&years>0;
 const used=money(f.usedSubsidy,'已享受政府补贴',true);if(used&&used.gt(region.cap))throw Error('政府补贴累计不能超过21600元');
 if(years<15&&age>=65&&f.extended!=='yes')throw Error('65岁不足年限需确认已按规定延长缴费；不能默认可以立即补齐');
 const subsidyKnown=!!used||f.never;const subsidyUsed=used||new D(region.cap); // Unknown history: conservative cap assumption, no invented subsidy.
 const asYear=Math.floor(a/12),sixtyYear=Math.floor((b+720)/12),sixtyFiveYear=Math.floor((b+780)/12);
 const firstYear=asYear+(f.paidThisYear==='yes'?1:0);if(!['yes','no'].includes(f.paidThisYear))throw Error('请选择今年是否已经缴费');
 const tier=Number(f.tier);if(!region.tiers.includes(tier))throw Error('请选择当地缴费档次');
 const selfCollective=Number(f.selfCollectiveTier||0);if(![0,...region.tiers].includes(selfCollective))throw Error('请选择合法的自费集体补助档次');if(selfCollective&&f.noCollective!=='yes')throw Error('请先确认村集体没有提供补助');const collectiveCredit=selfCollective?region.collectiveSubsidies[region.tiers.indexOf(selfCollective)]:0;
 const scenarios=region.tiers.map((annual,i)=>{
   let missing=Math.max(0,15-years),totalYears=years,account=new D(opening),out=new D(0),subsidy=new D(0),remaining=D.max(0,new D(region.cap).minus(subsidyUsed)),schedule=[];
   for(let y=firstYear;missing>0&&y*12+a%12<b+780;y++){const credit=D.min(remaining,region.subsidies[i]+collectiveCredit);remaining=remaining.minus(credit);subsidy=subsidy.plus(credit);out=out.plus(annual).plus(selfCollective);account=account.plus(annual).plus(selfCollective).plus(credit);missing--;totalYears++;schedule.push({year:y,type:'正常年缴（模拟在截至月缴）',years:1,cost:String(annual+selfCollective),subsidy:credit.toFixed(2)});}
   const lumpYears=missing;if(missing){const cost=new D(annual).mul(missing);out=out.plus(cost);account=account.plus(cost);schedule.push({year:Math.max(asYear,sixtyFiveYear),type:'65岁延缴后一次性缴费（需核定）',years:missing,cost:cost.toFixed(2),subsidy:'0.00'});totalYears+=missing;}
   const lastYear=schedule.length?schedule[schedule.length-1].year:asYear;
   const receiptYear=Math.max(sixtyYear,asYear,lastYear);const receivingAge=Math.max(60,receiptYear-Math.floor(b/12));
   // Annual records cannot determine the exact first receiving age. Show neighboring divisors.
   const lowAge=Math.max(60,receivingAge-1),highAge=Math.min(70,receivingAge);const base=new D(region.base).plus(Math.max(0,totalYears-15)*6);
   const low=account.div(divisors[lowAge]).plus(base),high=account.div(divisors[highAge]).plus(base);
   const recoveryFast=out.isZero()?0:out.div(high).ceil().toNumber(),recoverySlow=out.isZero()?0:out.div(low).ceil().toNumber();
   const lumpCost=new D(annual).mul(lumpYears),affordable=!budget||lumpCost.lte(budget);
   const normal=schedule.filter(row=>row.type.indexOf('正常年缴')===0);
   const paidAt60=years+normal.filter(row=>row.year*12+a%12<=b+720).length;
   const lumpAt=Math.max(a,b+780),lumpMonth=Math.floor(lumpAt/12)+'-'+String(lumpAt%12+1).padStart(2,'0');
   const timeline={normalYears:normal.length,normalCost:new D(annual).plus(selfCollective).mul(normal.length).toFixed(2),firstYear:normal.length?normal[0].year:null,lastYear:normal.length?normal[normal.length-1].year:null,paidAt60,missingAt60:Math.max(0,15-paidAt60),sixtyYear,lumpMonth,lumpAge:Math.max(65,age),receivingAge};
   return {timeline,annual,selfCollective,annualTotal:annual+selfCollective,total:out.toFixed(2),account:account.toFixed(2),subsidy:subsidy.toFixed(2),lumpYears,lumpCost:lumpCost.toFixed(2),receiptYear,low:low.toFixed(2),high:high.toFixed(2),personalLow:low.minus(base).toFixed(2),personalHigh:high.minus(base).toFixed(2),recoveryFast,recoverySlow,recoveryYearsFast:(recoveryFast/12).toFixed(1),recoveryYearsSlow:(recoverySlow/12).toFixed(1),affordable,shortfall:budget?D.max(0,lumpCost.minus(budget)).toFixed(2):'0.00',schedule,base:base.toFixed(2)};
 });
 const minimum=scenarios[0];for(const s of scenarios){const extra=new D(s.total).minus(minimum.total),delta=new D(s.low).minus(minimum.low);s.extra=extra.toFixed(2);s.delta=delta.toFixed(2);s.incrementalMonths=delta.gt(0)&&s.receiptYear===minimum.receiptYear?extra.div(delta).ceil().toNumber():null;}
 return {region:region.name,baseYear:region.baseYear,age,ageOnly:!!f.ageOnly,paidYears:years,pastPaid:f.never?'0.00':estimated?historical.toFixed(2):null,missing:Math.max(0,15-years),estimated,openingAmount:opening.toFixed(2),subsidyKnown,selfCollective,chosen:scenarios.find(s=>s.annual===tier),scenarios,sources:region.sources,warnings:[f.ageOnly?'只填年龄，按当前月份估算出生月；领取年份需补出生年月才能进一步核对。':'这里按整年安排缴费。具体从哪个月开始领，请向户籍街镇确认。','基础养老金按2025年每月297元计算，暂未计入今后的调整；未来缴费档次不变，利息按0计算。','过去漏交年份、历史提档、困难群体代缴、村集体出资和老参保人的特殊办法，都没有算入。自己加交的集体档只算以后年缴，不算到龄补缴。','预算只限制到龄补缴的金额，以后每年的缴费要另外准备。',estimated?'以前的账户金额按你填的缴费记录估算，没有加入历史补贴和利息，可能比实际余额少。':'账户储存额按已含利息、补贴处理，不重复加入历史金额。',subsidyKnown?'政府补贴按你填写的已领金额计算，累计不超过现行上限。':'不知道以前领过多少补贴时，暂不加上今后的补贴。查到后可在更多设置填写。']};
}
module.exports={calculate};
