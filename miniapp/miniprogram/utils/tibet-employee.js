const D=require('../vendor/decimal');
function context(r,{birth,first,asof,month,date}){
 if(r.tibetScopeConfirmed!=='yes')throw Error('请先核对西藏领取地、退休年月和最低缴费年限，再勾选确认');
 if(first<2000*12+6)throw Error('西藏2000年7月前参加工作可能有过渡待遇，本参考暂不适用');
 const end=month(r.tibetRetirementMonth,'核对后的退休年月','tibetRetirementMonth'),age=end-birth;
 if(end<asof||age<40*12||age>70*12)throw Error('请核对退休年月：不能早于截至月份，且退休年龄须在40至70岁之间');
 const value=String(r.tibetWorkYears==null?'':r.tibetWorkYears);
 if(!/^\d+(\.\d{1,2})?$/.test(value))throw Error('请填写退休时在藏工作年数，不能用全部缴费年数代替');
 const years=new D(value);
 const available=Math.min(end-birth-16*12,end-(2000*12+6)+1);
 if(years.lt(0)||years.mul(12).gt(available))throw Error('在藏工作年数超出2000年7月后、16岁至退休时的时间，请核对');
 const rate=years.gte(20)?'.15':years.gte(15)?'.10':years.gte(10)?'.05':'0';
 return {retirement:{month:date(end),ageMonths:age,delay:0,source:'USER_CONFIRMED',label:'已核对退休年月'},rate,years:years.toString()};
}
const subsidy=(base,index,rate)=>new D(base).mul(index).mul(rate);
module.exports={context,subsidy};
