const Decimal=require('../vendor/decimal');
const policy=require('./policy-data');
function serial(value){const m=String(value||'').trim().match(/^(\d{4})-(\d{1,2})$/);if(!m)return null;const y=Number(m[1]),n=Number(m[2]);return y>=1900&&y<=2100&&n>=1&&n<=12?y*12+n-1:null;}
function continuousMonths(first,last){const a=serial(first),b=serial(last);return a===null||b===null||b<a?null:b-a+1;}
function contributionRange(asof,regionId){if(regionId&&regionId!=='440100'){const p=require('./employee-registry').requireEmployee(regionId,asof);return {min:p.min,max:p.max,effectiveFrom:p.effectiveFrom,regionId};}const n=serial(asof),ranges=policy.contributionRanges;return {...ranges.filter(r=>n!==null&&serial(r.effectiveFrom)<=n).slice(-1)[0]||ranges[0]};}
function salaryGuidance(regionId){
 if(regionId==='440300')return {label:'上月税前工资（新入职填首月）',note:'按上月工资估算；新参加工作、重新就业或新成立单位填首月工资，并按现行上下限取值。',detail:'深圳按上月工资总额申报；新参加工作、重新就业或新成立单位的首月，按首月工资总额。请填税前工资，不是到手工资。'};
 return {label:'税前月工资（优先填上年月平均）',note:'按税前工资估算，并限制在缴费上下限内；实际申报基数可能不同。',detail:'工资估算优先用上年度税前月平均工资（含奖金等），当前工资、到手工资不等于申报基数。'};
}
function resolveBase(mode,value,range){
 if(mode==='MINIMUM')return {base:String(range.min),note:'按最低档计算；单位在职须按实际申报工资缴费。'};
 if(!/^\d+(\.\d{1,2})?$/.test(String(value))||new Decimal(value).lte(0))throw Error('请输入大于0的金额，最多两位小数');
 const amount=new Decimal(value);
 if(mode==='DEDUCTION'){
  const base=amount.div('.08');
  // Payroll amounts are rounded to cents; clamp only a half-cent deduction tolerance at the limits.
  if(base.lt(new Decimal(range.min).minus('.0625'))||base.gt(new Decimal(range.max).plus('.0625')))throw Error('反推基数超出所选月份范围；请确认填的是单月养老保险个人扣款，不含医保、公积金或补缴');
  return {base:Decimal.max(range.min,Decimal.min(range.max,base)).toFixed(2),note:'按单月养老保险个人扣款÷8%反推，不含补缴。'};
 }
 if(mode==='SALARY')return {base:Decimal.max(range.min,Decimal.min(range.max,amount)).toFixed(2),note:salaryGuidance(range.regionId).note};
 if(mode!=='DIRECT'||amount.lt(range.min)||amount.gt(range.max))throw Error('缴费基数应在'+range.min+'～'+range.max+'元之间');
 return {base:amount.toFixed(2),note:'按你查询到的实际缴费基数估算。'};
}
module.exports={continuousMonths,contributionRange,resolveBase,salaryGuidance};
