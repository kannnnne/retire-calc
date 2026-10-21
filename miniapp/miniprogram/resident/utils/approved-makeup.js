const D=require('../../vendor/decimal'),rules=require('../../utils/resident-makeup-policies');
const serial=s=>Number(s.slice(0,4))*12+Number(s.slice(5))-1;
function amount(value,label){if(!/^\d+(\.\d{1,2})?$/.test(String(value))||new D(value).lte(0)||new D(value).gt(100000000))throw Error('请核对'+label);return new D(value);}
function calculateOne(f,ctx){
 const plan=f.approvedPlan,empty={cost:new D(0),subsidy:new D(0),addedYears:0,upgradedYears:0,entries:[],policyPatch:null};if(!plan)return empty;
 const rule=rules.get(f.regionId,ctx.policy.rule);if(!rule||!rule.modes.includes(plan.mode))throw Error('这个地区尚未接入这种补缴方式');
 if((f.gxMakeupRows||[]).length||f.gxTransitionEnabled==='yes')throw Error('不能同时使用两套补缴方案');
 if(plan.regionId!==f.regionId||plan.birth!==f.birth||plan.asOf!==f.asOf||String(plan.paidYears)!==String(f.years))throw Error('参保信息已改变，请重新核对补缴方案');
 if(plan.confirmed!=='yes'||f.receiving==='yes')throw Error('请先确认尚未领取基本养老金，且补缴资格、年份和金额已经社保核对');
 if(rule.effectiveFrom&&serial(f.asOf)<serial(rule.effectiveFrom)||rule.validThrough&&serial(f.asOf)>serial(rule.validThrough))throw Error('这份补缴规定不适用于所填月份，请核对最新规定');
 if(rule.minAge!=null&&ctx.age<rule.minAge||plan.mode==='upgrade'&&rule.upgradeMinAge!=null&&ctx.age<rule.upgradeMinAge)throw Error('尚未达到这项补缴规定的适用年龄');
 if(rule.distanceMonths&&serial(f.birth)+720-serial(f.asOf)>=rule.distanceMonths)throw Error('距60岁仍有15年或以上，不能套用这项补缴办法');
 const noTransitionFee=plan.mode==='transition'&&/^\d+$/.test(String(plan.requiredYears))&&Number(plan.requiredYears)>=1&&Number(plan.requiredYears)<=15&&ctx.years>=Number(plan.requiredYears)&&String(plan.annual)==='0';
 const unit=noTransitionFee?new D(0):amount(plan.annual,'社保确认的每年补缴金额');if(rule.min&&unit.lt(rule.min)||rule.max&&unit.gt(rule.max))throw Error('补缴金额超出已核政策范围');
 if(rule.tiers&&!rule.tiers.includes(unit.toNumber()))throw Error('补缴金额不在已核可选档次中');
 if(plan.mode==='lump'){
  if(ctx.years>=15)throw Error('已交够15年，无需补足年限');
  const at=Math.max(serial(f.asOf),serial(f.birth)+720);if(rule.validThrough&&at>serial(rule.validThrough))throw Error('到60岁时已超过这份规定的有效期，不能按本规定预排补足');
  return {...empty,policyPatch:{lumpAt60:true,lumpAt65:false,lumpUnitPrice:unit.toFixed(2)},approved:{mode:'lump',annual:unit.toFixed(2),sourceId:rule.sources[0].id}};
 }
 if(plan.mode==='transition'){
  if(ctx.years>15)throw Error('本入口原制度过渡累计不超过15年；已超过者请按普通记录计算');
  if(plan.transitionReviewed!=='yes')throw Error('请另行确认社保已核定你适用原制度过渡办法');
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(plan.schemeStart||''))||serial(plan.schemeStart)>serial('2014-02'))throw Error('请填写经办核定的原新农保或城居保建立年月，不能用首次参保年月代替');
  const elapsed=serial(plan.schemeStart)-serial(f.birth);if(elapsed<=540||elapsed>=720)throw Error('原制度建立时须距60岁不足15年且尚未满60岁，不能仅看现在年龄');
  if(rule.allowedSchemeStarts&&!rule.allowedSchemeStarts.includes(plan.schemeStart))throw Error('北京本入口只核2009-01本市原户籍或2013-01外埠进京条件');
  if(rule.firstRegistrationFrom){const y=Number(plan.firstRegistrationYear);if(!/^\d{4}$/.test(String(plan.firstRegistrationYear))||y<rule.firstRegistrationFrom||y>Number(f.asOf.slice(0,4)))throw Error('北京本入口只支持2015年及以后首次参保，旧制度领取条件请另核');if(ctx.years>Number(f.asOf.slice(0,4))-y+(f.paidThisYear==='yes'?1:0))throw Error('已交年数超过首次参保后可交年度，请核对');}
  const target=Number(plan.requiredYears);if(!/^\d+$/.test(String(plan.requiredYears))||target<1||target>15||rule.requiredYears&&target!==rule.requiredYears)throw Error('请填写社保核定的所需总年数（1至15年，北京本入口为15年）');
  return {...empty,policyPatch:{targetYears:target,lumpAt60:true,lumpAt65:false,lumpUnitPrice:unit.toFixed(2),paymentNote:'按原制度过渡核定共需'+target+'年及核定补缴单价计算；地方细则或补缴补贴未核齐的部分不自动加入。'},approved:{mode:'transition',annual:unit.toFixed(2),requiredYears:target,subsidyKnown:false,referenceMode:rule.referenceMode,sourceId:rule.sources[0].id}};
 }
 if(plan.mode==='extension'){
  const paid=Number(plan.extensionPaidYears),a=serial(f.asOf),b=serial(f.birth),asYear=Number(f.asOf.slice(0,4)),calendar=Math.max(0,asYear-Number(f.birth.slice(0,4))-60+(f.paidThisYear==='yes'?1:0));
  if(!/^\d+$/.test(String(plan.extensionPaidYears))||paid>Math.min(rule.extensionYears,ctx.years,calendar))throw Error('请核对60岁以后按规定已交的年数，不能超过已交记录或实际年度');
  const first=asYear+(f.paidThisYear==='yes'?1:0),payment=y=>Math.max(a,y*12+a%12);let before=0;while(before<60&&payment(first+before)<b+720)before++;
  const remaining=rule.extensionYears-paid,lastYear=first+before+remaining-1,at=Math.max(a,b+rule.lumpAge*12,a+remaining*12,remaining?payment(lastYear):a);
  return {...empty,policyPatch:{lumpAt60:false,lumpAt65:true,lumpAtMonth:at,includeNormalAtLump:remaining>0,normalYearsCap:before+remaining,lumpUnitPrice:unit.toFixed(2),paymentNote:'按已核60岁后缴费记录安排；延缴满5年且满65岁仍不足15年才补足，不补发以前月份。'},approved:{mode:'extension',annual:unit.toFixed(2),extensionPaidYears:paid,sourceId:rule.sources[0].id}};
 }
 const start=Number(plan.start),end=Number(plan.end),asYear=Number(f.asOf.slice(0,4));
 if(!/^\d{4}$/.test(String(plan.start))||!/^\d{4}$/.test(String(plan.end))||start>end||start<Number(f.birth.slice(0,4))+16||end>=asYear)throw Error('请填16岁以后、今年以前实际可补的年份');
 if(rule.lastMissingYear&&plan.mode==='missing'&&end>rule.lastMissingYear)throw Error('这项规定只接入'+rule.lastMissingYear+'年及以前的欠费补缴');
 const count=end-start+1;if(count>30)throw Error('一次最多填写30个年度，请核对年份');
 const known=new Map();if(f.historyMode==='segments')for(const row of f.segments||[])for(let y=Number(row.start);y<=Number(row.end);y++)known.set(y,new D(row.annual));
 const original=plan.mode==='upgrade'?amount(plan.original,'原来每年实际缴费金额'):new D(0);if(plan.mode==='upgrade'&&!unit.gt(original))throw Error('提档后的金额必须高于原缴费金额');
 for(let y=start;y<=end;y++){if(plan.mode==='missing'&&known.has(y))throw Error(y+'年已经缴过，不能再算漏缴');if(plan.mode==='upgrade'&&known.size&&(!known.has(y)||!known.get(y).eq(original)))throw Error(y+'年与原缴费记录不一致');}
 const upgraded=plan.mode==='upgrade'?count:0,added=plan.mode==='missing'?count:0;
 if(upgraded>ctx.years-(f.paidThisYear==='yes'?1:0))throw Error('历史提档年数超过已交年数，请勿把今年也算进去');
 const prior=original.mul(count);if(prior.gt(ctx.estimated?ctx.historical:ctx.opening)||ctx.estimated&&upgraded===ctx.years&&!prior.eq(ctx.historical))throw Error('原缴费总额与已填历史金额不一致');
 if(ctx.years+added>asYear-Number(f.birth.slice(0,4))-16+(f.paidThisYear==='yes'?1:0)||rule.capYears&&ctx.years+added>rule.capYears||rule.maxAddedYears&&added>rule.maxAddedYears)throw Error('已交与补缴年数超出可补范围');
 const cost=unit.minus(original).mul(count);return {...empty,cost,addedYears:added,upgradedYears:upgraded,entries:Array.from({length:count},(_,i)=>({year:start+i,mode:plan.mode,cost:unit.minus(original).toFixed(2),subsidy:'0.00',original:original.toFixed(2),target:unit.toFixed(2)})),approved:{mode:plan.mode,sourceId:rule.sources[0].id}};
}
function calculate(f,ctx){
 const plan=f.approvedPlan;if(!plan||!Object.prototype.hasOwnProperty.call(plan,'rows'))return calculateOne(f,ctx);
 if(!Array.isArray(plan.rows)||!plan.rows.length||plan.rows.length>20)throw Error('核定补缴记录须为1至20段');
 const total={cost:new D(0),subsidy:new D(0),addedYears:0,upgradedYears:0,entries:[],policyPatch:null,approved:{mode:'combined',sourceIds:[],subsidyKnown:true}},seen=new Set();let special=null,original=new D(0);
 for(let i=0;i<plan.rows.length;i++){
  const row=plan.rows[i];if(!row||typeof row!=='object'||Array.isArray(row)||Object.prototype.hasOwnProperty.call(row,'rows'))throw Error('第'+(i+1)+'段格式不正确');
  let result;try{result=calculateOne({...f,approvedPlan:{...plan,...row,rows:undefined}},ctx);}catch(e){throw Error('第'+(i+1)+'段：'+e.message);}
  if(result.policyPatch){if(special)throw Error('到龄补足、过渡或延缴补足只能选择一种，不能重复买年限');special=result.approved.mode;total.policyPatch=result.policyPatch;}
  for(const entry of result.entries){if(seen.has(entry.year))throw Error(entry.year+'年重复补缴或提档，请合并记录');seen.add(entry.year);if(entry.mode==='upgrade')original=original.plus(entry.original);total.entries.push(entry);}
  total.cost=total.cost.plus(result.cost);total.subsidy=total.subsidy.plus(result.subsidy);total.addedYears+=result.addedYears;total.upgradedYears+=result.upgradedYears;total.approved.sourceIds.push(result.approved.sourceId);if(result.approved.subsidyKnown===false)total.approved.subsidyKnown=false;if(result.approved.referenceMode)total.approved.referenceMode=result.approved.referenceMode;
 }
 if(total.upgradedYears>ctx.years-(f.paidThisYear==='yes'?1:0)||original.gt(ctx.estimated?ctx.historical:ctx.opening)||ctx.estimated&&total.upgradedYears===ctx.years&&!original.eq(ctx.historical))throw Error('多段提档的原金额或年数超过已交记录，不能重复计算原本金');
 const rule=rules.get(f.regionId,ctx.policy.rule),asYear=Number(f.asOf.slice(0,4)),possible=asYear-Number(f.birth.slice(0,4))-16+(f.paidThisYear==='yes'?1:0);
 if(ctx.years+total.addedYears>possible||rule.capYears&&ctx.years+total.addedYears>rule.capYears||rule.maxAddedYears&&total.addedYears>rule.maxAddedYears)throw Error('多段补缴年数合计超过允许范围');
 total.entries.sort((a,b)=>a.year-b.year);total.approved.sourceIds=[...new Set(total.approved.sourceIds)];total.approved.specialMode=special;return total;
}
module.exports={calculate};
