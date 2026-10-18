// Ordinary annual payments; Guangdong extension is configured separately.
// Historical make-up payments are intentionally not inferred from age alone.
const D=require('../../vendor/decimal');
const {city,capability}=require('../../utils/city-policies');
const localRules=require('../../utils/local-resident-policies');
const gxMakeup=require('./gx-makeup');
const ageDivisors=require('../../utils/policy-data').accountMonths;
const amount=(v,label,optional=false)=>{if(optional&&(v===''||v==null))return null;if(!/^\d+(\.\d{1,2})?$/.test(String(v))||new D(v).gt(100000000))throw Error('请检查'+label);return new D(v);};
function serial(v){const m=String(v||'').match(/^(\d{4})-(\d{2})$/);if(!m||+m[1]<1900||+m[1]>2100||+m[2]<1||+m[2]>12)throw Error('请检查出生和截至年月');return +m[1]*12+(+m[2]-1);}
function calculate(f){
 const c=city(f.regionId),p=localRules.resolve(capability(f.regionId,'resident'),f.localArea);if(!p||p.status!=='READY'||p.legacy)throw Error(p&&p.reason||'这个地区还没开放计算');
 const b=serial(f.birth),a=serial(f.asOf),age=Math.floor((a-b)/12),asYear=Math.floor(a/12);if(a<2026*12||age<16||age>70)throw Error('本地区支持2026年起、16至70岁的普通参保情况');
 if(p.effectiveFrom&&a<serial(p.effectiveFrom))throw Error('本参考包含'+p.effectiveFrom+'起的标准，请核对数据截至月份');
 if(f.eligible!=='yes')throw Error('请先确认本市居民参保资格');
 if(f.ordinary!=='yes')throw Error('请先确认按普通逐年缴费计算；老制度、特殊补缴不能直接套用');
 if(p.ordinaryCutoff&&!f.never&&Number(f.years)<15&&b<=serial(p.ordinaryCutoff)&&f.transition!=='no')throw Error('中山2011年11月制度建立时的领取条件可能适用，请向经办核对后确认按普通办法计算');
 const cd=p.rule==='CHENGDU_REFERENCE';
 if(cd&&!['rural','urban'].includes(f.cdResidence))throw Error('请选择成都农村居民或城镇居民，缴费档次不同');
 const years=Number(f.years);if(!/^\d+$/.test(String(f.years))||years>age-15)throw Error('请核对累计已缴年数');
 if(cd&&years>asYear-2012+1)throw Error('成都2012年前参保或历史趸缴需另核，本页暂只算2012年起普通年缴');
 if(p.lumpAt65&&age>=65&&years<15&&f.extended!=='yes')throw Error('65岁不足15年，请先确认已按规定延缴、可一次补足，不能只按年龄认定补缴资格');
 if(p.rule==='BEIJING_ORDINARY'&&years>asYear-2015+1)throw Error('2015年前已参保涉及北京原制度，请向经办核对，不能按本页普通办法计算');
 if(!['yes','no'].includes(f.paidThisYear))throw Error('请选择今年是否已缴');
 if(f.paidThisYear==='yes'&&years===0)throw Error('今年已缴与0年不一致，需包含至少1年缴费记录');
 if(cd&&years>asYear-2012+(f.paidThisYear==='yes'?1:0))throw Error('本页成都历史年缴仅从2012年起，请核对今年是否已含');
 const balance=amount(f.balance,'账户储存额',true),past=amount(f.pastAnnual,'历史年缴金额',true),budget=amount(f.budget,'一次预算',true);
 if(f.never&&(years!==0||balance&&!balance.isZero()||f.paidThisYear==='yes'))throw Error('从未参保的年数、账户和今年缴费不一致');
 if(Number(f.selfCollectiveTier||0)!==0)throw Error('本地区暂不计算自费集体档，不能沿用广州选项');
 let historical=new D(past||0).mul(years);
 if(f.historyMode==='segments'){
  if(f.never)throw Error('从未参保无需历史记录');let n=0;historical=new D(0);const seen=new Set();
  for(const row of f.segments||[]){if(!/^\d{4}$/.test(row.start)||!/^\d{4}$/.test(row.end)||+row.start>+row.end||+row.end>asYear||+row.start<Math.floor(b/12)+16||cd&&+row.start<2012||p.rule==='BEIJING_ORDINARY'&&+row.start<2015)throw Error('请核对历史阶段年份');const v=amount(row.annual,'阶段缴费金额');for(let y=+row.start;y<=+row.end;y++){if(seen.has(y))throw Error('历史阶段不能重叠');seen.add(y);n++;historical=historical.plus(v);}}
  if(n!==years||(f.paidThisYear==='yes')!==seen.has(asYear))throw Error('历史阶段与已缴年数、今年缴费不一致');
 }else if(!balance&&years>0&&!past)throw Error('请填写历史年缴金额或查询到的账户储存额');
 if(cd&&years>0&&f.historyMode!=='segments'&&(!past||past.isZero()))throw Error('成都基础养老金还需历史年缴金额，账户余额不能代替缴费记录');
 const opening=balance||(cd?historical.mul('.8'):historical),estimated=!balance&&years>0;
 const makeup=gxMakeup.calculate(f,{policy:p,years,asYear,birthYear:Math.floor(b/12),opening,historical,estimated}),plannedYears=years+makeup.addedYears;
 const chosenAnnual=Number(f.tier);if(p.continuous){if(!/^\d+(\.\d{1,2})?$/.test(String(f.tier))||chosenAnnual<1000||chosenAnnual>9000)throw Error('北京每年自选1000至9000元');}else if(!p.tiers.includes(chosenAnnual))throw Error('请选择当地缴费档次');
 const allowedTiers=cd&&f.cdResidence==='urban'?p.tiers.slice(3):p.tiers;
 if(p.lumpCap&&age>=60&&chosenAnnual>p.lumpCap)throw Error('杭州到龄补缴每年最高5000元，请重新选择补缴档');
 if(!allowedTiers.includes(chosenAnnual)&&!p.continuous)throw Error('成都城镇居民只可选40%或50%档，请重新选择');
 const scenarioTiers=p.lumpCap&&age>=60?allowedTiers.filter(v=>v<=p.lumpCap):allowedTiers;
 const annuals=[...new Set([...scenarioTiers,chosenAnnual])].sort((x,y)=>x-y),firstYear=asYear+(f.paidThisYear==='yes'?1:0),missing=Math.max(0,15-plannedYears);
 const lockedCurrent=localRules.requiresCurrentTier(p,f,age),currentTier=Number(f.currentYearTier);
 if(lockedCurrent&&(!/^\d+$/.test(String(f.currentYearTier))||!p.tiers.includes(currentTier)))throw Error('请先选择今年实际已确认的年缴档次，以后选档不会改今年这笔费用');
 const paymentMonth=year=>Math.max(a,year*12+(p.annualMonth?p.annualMonth-1:a%12));
 const scenarios=annuals.map(annual=>{
  const schedule=[];let account=new D(opening).plus(makeup.cost).plus(makeup.subsidy),out=new D(makeup.cost),subsidy=new D(makeup.subsidy);
  const credit=p.continuous?(annual<2000?60:annual<4000?90:annual<6000?120:150):p.subsidies[p.tiers.indexOf(annual)];
  let normalYears=0;
  for(let i=0;i<missing;i++){if((p.lumpAt65||p.lumpAt60)&&paymentMonth(firstYear+i)>=b+(p.lumpAt60?720:780))break;const lateCurrent=p.currentPaymentNeedsConfirmation&&firstYear+i===asYear&&a%12!==p.annualMonth-1;const payAnnual=lockedCurrent&&firstYear+i===asYear?currentTier:annual,payCredit=payAnnual===annual?credit:p.subsidies[p.tiers.indexOf(payAnnual)];const grant=lateCurrent||p.subsidyLimitYears&&plannedYears+i>=p.subsidyLimitYears?0:payCredit;out=out.plus(payAnnual);account=account.plus(cd?new D(payAnnual).mul('.8'):new D(payAnnual).plus(grant));subsidy=subsidy.plus(grant);normalYears++;schedule.push({year:firstYear+i,type:'正常年缴',years:1,cost:String(payAnnual),subsidy:new D(grant).toFixed(2)});}
  const lumpYears=missing-normalYears,lumpUnit=cd?new D(p.lumpTotals[p.tiers.indexOf(annual)]).div(15):new D(p.lumpCap?Math.min(annual,p.lumpCap):annual),lumpCost=lumpUnit.mul(lumpYears),normalLastYear=schedule.length?schedule[schedule.length-1].year:null;
  if(lumpYears){out=out.plus(lumpCost);account=account.plus(cd?lumpCost.mul(2).div(3):lumpCost);schedule.push({year:Math.floor(Math.max(a,b+(p.lumpAt60?720:780))/12),type:cd?'60岁趸缴补足（所选档参考，须核定）':p.lumpAt60?(p.lumpCap?'60岁补缴年限（最高'+p.lumpCap+'元／年，无补贴）':'60岁趸缴补足（所选档参考，无补贴）'):'65岁延缴后补足（同档参考，须核定）',years:lumpYears,cost:lumpCost.toFixed(2),subsidy:'0.00'});}
  const lumpAt=Math.max(a,b+(p.lumpAt60?720:780));
  const lastYear=schedule.length?schedule[schedule.length-1].year:asYear,sixtyYear=Math.floor((b+720)/12),eligibleAt=Math.max(b+720,a,lumpYears?lumpAt:paymentMonth(lastYear)),receiptYear=Math.floor((eligibleAt+1)/12),receivingAge=Math.floor((eligibleAt+1-b)/12);
  if(p.rule==='BEIJING_ORDINARY'&&receivingAge>70)throw Error('北京延期领取年龄超过70岁，本工具暂不支持，请由经办机构核算');
  if(cd&&receivingAge>70)throw Error('成都参考领取年龄暂限60至70岁');
  if(p.ageDivisor&&receivingAge>70)throw Error('本地区首次领取年龄超过70岁，个人账户计发月数须由经办核定');
  const divisor=(p.rule==='BEIJING_ORDINARY'||cd||p.ageDivisor)?ageDivisors[Math.max(60,receivingAge)]:139;
  const cdIndexed=cd?historical.div('.1').div(12).plus(new D(annual).div('.1').div(12).mul(normalYears)).plus(lumpCost.div('.12').div(12)).mul('.01'):new D(0);
  const base=new D(p.base).plus(cdIndexed).plus(localRules.tenureExtra(p,plannedYears+missing)).plus(localRules.ageExtra(p,receivingAge)).plus(p.rule==='SHANGHAI_ORDINARY'&&receivingAge>=70?10:0),personal=account.div(divisor),monthly=base.plus(personal),recovery=out.isZero()?0:out.div(monthly).ceil().toNumber();
  const paidAt60=plannedYears+schedule.filter(s=>s.type==='正常年缴'&&paymentMonth(s.year)<=b+720).length;
  return {immediateCost:makeup.entries.length?makeup.cost.toFixed(2):null,annual,annualTotal:annual,selfCollective:0,total:out.toFixed(2),account:account.toFixed(2),subsidy:subsidy.toFixed(2),lumpYears,lumpUnit:lumpUnit.toFixed(2),lumpCost:lumpCost.toFixed(2),receiptYear,low:monthly.toFixed(2),high:monthly.toFixed(2),personalLow:personal.toFixed(2),personalHigh:personal.toFixed(2),base:base.toFixed(2),recoveryFast:recovery,recoverySlow:recovery,recoveryYearsFast:(recovery/12).toFixed(1),recoveryYearsSlow:(recovery/12).toFixed(1),affordable:!budget||lumpCost.plus(makeup.cost).lte(budget),shortfall:budget?D.max(0,lumpCost.plus(makeup.cost).minus(budget)).toFixed(2):'0.00',schedule,timeline:{normalYears,lockedYear:lockedCurrent&&normalYears?asYear:null,lockedAnnual:lockedCurrent&&normalYears?currentTier:null,futureNormalYears:normalYears-(lockedCurrent&&normalYears?1:0),futureFirstYear:normalYears?(lockedCurrent?firstYear+1:firstYear):null,normalCost:schedule.filter(x=>x.type==='正常年缴').reduce((sum,x)=>sum.plus(x.cost),new D(0)).toFixed(2),firstYear:normalYears?firstYear:null,lastYear:normalLastYear,paidAt60,missingAt60:Math.max(0,15-paidAt60),sixtyYear,lumpMonth:lumpYears?Math.floor(lumpAt/12)+'-'+String(lumpAt%12+1).padStart(2,'0'):null,lumpAge:lumpYears?Math.max(p.lumpAt60?60:65,age):null,receivingAge}};
 });
 const lowest=scenarios[0];for(const s of scenarios){const extra=new D(s.total).minus(lowest.total),delta=new D(s.low).minus(lowest.low);s.extra=extra.toFixed(2);s.delta=delta.toFixed(2);s.incrementalMonths=delta.gt(0)?extra.div(delta).ceil().toNumber():null;}
 return {region:c.name+(p.areaName?' · '+p.areaName:''),regionId:c.id,localArea:f.localArea||'',referenceLabel:p.referenceLabel||'',referenceText:p.referenceText||'',baseYear:p.baseYear,age,ageOnly:!!f.ageOnly,paidYears:years,makeup:makeup.entries.length?{cost:makeup.cost.toFixed(2),subsidy:makeup.subsidy.toFixed(2),addedYears:makeup.addedYears,upgradedYears:makeup.upgradedYears,entries:makeup.entries}:null,pastPaid:(estimated||cd&&years>0)?historical.toFixed(2):f.never?'0.00':null,missing:Math.max(0,15-years),remainingAfterMakeup:missing,estimated,openingAmount:opening.toFixed(2),subsidyKnown:!cd,selfCollective:0,chosen:scenarios.find(s=>s.annual===chosenAnnual),scenarios,sources:p.sources,warnings:[...(makeup.entries.length?['补缴起点及原金额按你填写的经办确认信息；正式缴费需社保审核。历史断缴及提档不补贴，只有本年提档按自治区参考补差，未计待核市县额外补贴。']:[]),...(p.referenceText?[p.referenceText]:[]),...(p.currentPaymentNeedsConfirmation&&f.paidThisYear==='no'&&a%12!==0?['深圳当年1月已过：当前年度补贴保守按0计，新参保登记当月等可享补贴情形须经办核对；以后年度按1月及时缴费计算。']:[]),...(cd?['成都只支持2012年起普通年缴；此前趸缴、转入和特殊权益不在本页范围。','历史账户按本人年缴额的80%粗算，未计历史补贴利息；基础养老金按历史本人缴费推算基数，未逐年还原指数。','成都政府2%缴费补贴已列入计划说明，个人账户暂只记基数8%，未计待核实的省级缴费补贴入账增额。','到60岁趸缴按12%计费，无政府缴费补贴；不能用个人10%的年缴单价乘补缴年数。']:[]),p.paymentNote|| (cd?'按成都所选档逐年交至60岁，再按12%趸缴单价补不足年数；是办理参考方案，不是任意金额提档。':p.lumpAt65?'普通延缴至65岁仍不足15年才安排补年限，补缴档暂按同档参考，不享补贴，办理资格与档次须核定。':'按普通逐年缴费至满15年安排，不包含历史补缴、提档、困难群体代缴或其他特殊待遇。'),'基础养老金沿用'+p.baseYear+'年每月'+p.base+'元，未来档次不变，利息和待遇调整未计入。',estimated?(cd?'历史账户不是本人全部缴费额，已按基数8%记入。':'历史账户只按本人缴费估算，没有加入历史补贴及利息。'):'账户按查询金额计算，不重复加入历史缴费。','年度缴费截止日期请查看当地当年通知；达到年龄和年限后，具体起领月份以办理核定为准。']};
}
module.exports={calculate};
