const D=require('../../vendor/decimal'),rules=require('../../utils/resident-makeup-policies');
const serial=s=>Number(s.slice(0,4))*12+Number(s.slice(5))-1;
function amount(value,label){if(!/^\d+(\.\d{1,2})?$/.test(String(value))||new D(value).lte(0)||new D(value).gt(100000000))throw Error('请核对'+label);return new D(value);}
function calculate(f,ctx){
 const plan=f.approvedPlan,empty={cost:new D(0),subsidy:new D(0),addedYears:0,upgradedYears:0,entries:[],policyPatch:null};if(!plan)return empty;
 const rule=rules.get(f.regionId,ctx.policy.rule);if(!rule||!rule.modes.includes(plan.mode))throw Error('这个地区尚未接入这种补缴方式');
 if((f.gxMakeupRows||[]).length||f.gxTransitionEnabled==='yes')throw Error('不能同时使用两套补缴方案');
 if(plan.regionId!==f.regionId||plan.birth!==f.birth||plan.asOf!==f.asOf||String(plan.paidYears)!==String(f.years))throw Error('参保信息已改变，请重新核对补缴方案');
 if(plan.confirmed!=='yes'||f.receiving==='yes')throw Error('请先确认尚未领取基本养老金，且补缴资格、年份和金额已经社保核对');
 if(rule.effectiveFrom&&serial(f.asOf)<serial(rule.effectiveFrom)||rule.validThrough&&serial(f.asOf)>serial(rule.validThrough))throw Error('这份补缴规定不适用于所填月份，请核对最新规定');
 if(rule.minAge!=null&&ctx.age<rule.minAge||plan.mode==='upgrade'&&rule.upgradeMinAge!=null&&ctx.age<rule.upgradeMinAge)throw Error('尚未达到这项补缴规定的适用年龄');
 if(rule.distanceMonths&&serial(f.birth)+720-serial(f.asOf)>=rule.distanceMonths)throw Error('距60岁仍有15年或以上，不能套用这项补缴办法');
 const unit=amount(plan.annual,'社保确认的每年补缴金额');if(rule.min&&unit.lt(rule.min)||rule.max&&unit.gt(rule.max))throw Error('补缴金额超出已核政策范围');
 if(rule.tiers&&!rule.tiers.includes(unit.toNumber()))throw Error('补缴金额不在已核可选档次中');
 if(plan.mode==='lump'){
  if(ctx.years>=15)throw Error('已交够15年，无需补足年限');
  const at=Math.max(serial(f.asOf),serial(f.birth)+720);if(rule.validThrough&&at>serial(rule.validThrough))throw Error('到60岁时已超过这份规定的有效期，不能按本规定预排补足');
  return {...empty,policyPatch:{lumpAt60:true,lumpAt65:false,lumpUnitPrice:unit.toFixed(2)},approved:{mode:'lump',annual:unit.toFixed(2),sourceId:rule.sources[0].id}};
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
 if(ctx.years+added>asYear-Number(f.birth.slice(0,4))-16+(f.paidThisYear==='yes'?1:0)||rule.capYears&&ctx.years+added>rule.capYears)throw Error('已交与补缴年数超出可补范围');
 const cost=unit.minus(original).mul(count);return {...empty,cost,addedYears:added,upgradedYears:upgraded,entries:Array.from({length:count},(_,i)=>({year:start+i,mode:plan.mode,cost:unit.minus(original).toFixed(2),subsidy:'0.00',original:original.toFixed(2),target:unit.toFixed(2)})),approved:{mode:plan.mode,sourceId:rule.sources[0].id}};
}
module.exports={calculate};
