// Unit and flexible employment belong to the same employee pension scheme.
const Decimal=require('../vendor/decimal');
const {serial}=require('./employee-inputs');
const D=v=>new Decimal(v);
function months(years,remainder,label){
 if(!/^\d+$/.test(String(years))||!/^\d+$/.test(String(remainder)))throw Error('请填写'+label+'年数和月数，没交过填0');
 const y=Number(years),m=Number(remainder);
 if(y>80||m>11)throw Error(label+'月数填0至11，满12个月算1年');
 return y*12+m;
}
function history(f){const unit=months(f.unitYears,f.unitMonths,'单位缴费'),flex=months(f.flexYears,f.flexMonths,'自己缴费');if(unit+flex>960)throw Error('累计缴费年限超出范围');return {unit,flex,total:unit+flex};}
function amount(v,label,zero=false){if(!/^\d+(\.\d{1,2})?$/.test(String(v))||D(v).lt(zero?0:.01)||D(v).gt(100000000))throw Error('请填写'+label+'（最多两位小数）');return D(v);}
function estimate(f,h,minimum,custom){
 if(h.total&&serial(f.firstInsuredMonth)<serial('2006-01'))throw Error('2006年前交过的账户金额，请改填查询余额');
 const unit=custom&&h.unit?amount(f.unitPayment,'以前单位每月养老个人扣款'):D(minimum).mul('.08');
 const flex=custom&&h.flex?amount(f.flexPayment,'以前自己每月养老缴费'):D(minimum).mul('.20');
 // Of the full flexible payment (20% of base), 8% of base enters the account.
 return unit.mul(h.unit).plus(flex.mul('.4').mul(h.flex)).toFixed(2);
}
function futureBase(mode,value,limits){
 if(mode===0)return D(limits.min).toFixed(2);
 const v=amount(value,mode===1?'以后每月养老缴费':'以后每月缴费基数');
 const base=mode===1?v.div('.20'):v;
 // A cent-rounded full payment may reverse to a base just outside the limit.
 const tolerance=mode===1?D('.025'):D(0);
 if(base.lt(D(limits.min).minus(tolerance))||base.gt(D(limits.max).plus(tolerance)))throw Error('每月养老缴费应在'+D(limits.min).mul('.2').toFixed(2)+'至'+D(limits.max).mul('.2').toFixed(2)+'元之间');
 return Decimal.max(limits.min,Decimal.min(limits.max,base)).toFixed(2);
}
module.exports={history,estimate,futureBase,amount};
