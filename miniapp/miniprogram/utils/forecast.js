const Decimal = require('../vendor/decimal');
const policy = require('./policy-data');
const {contributionRange}=require('./input-model');
Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP });
const D = v => new Decimal(v);
const money = v => v == null ? null : D(v).toFixed(2);
function invalid(message,field,step=0) { const error=new Error(message);error.field=field;error.step=step;throw error; }
function month(s,label='年月',field='birthMonth') {
  const match=String(s||'').trim().match(/^(\d{4})-(\d{1,2})(?:-(\d{2}))?$/);
  if (!match) invalid('请重新选择'+label+'，格式例如2026-09',field);
  const y=Number(match[1]),m=Number(match[2]);
  if (m<1 || m>12 || y<1900 || y>2100) invalid(label+'超出支持范围，请重新选择',field);
  if(match[3] && (Number(match[3])<1||Number(match[3])>new Date(y,m,0).getDate())) invalid(label+'不是有效日期',field);
  return y*12+m-1;
}
function date(n) { return Math.floor(n/12)+'-'+String(n%12+1).padStart(2,'0'); }
function retirement(birth,category) {
  const rows = { MALE:[60,1965,4,36], FEMALE_55:[55,1970,4,36], FEMALE_50:[50,1975,2,60] };
  if(!rows[category]) throw Error('请选择退休人员类别');
  const [age,start,group,max] = rows[category], b=month(birth), offset=b-start*12;
  const delay=offset<0?0:Math.min(max,Math.floor(offset/group)+1);
  return {month:date(b+age*12+delay),ageMonths:age*12+delay,delay};
}
const minimum = year => year<2030?180:180+Math.min(10,year-2029)*6;
function basic(base,index,months) {
  const i=D(index), correction=i.lt('.6')?i.div('.6'):D(1);
  return D(base).mul(correction.plus(i)).div(2).mul(months).div(12).mul('.01');
}
function number(value,label,min,max,integer=false,optional=false) {
  if(optional && (value==null || value==='')) return null;
  if(value==null || value==='' || !/^\d+(\.\d+)?$/.test(String(value))) throw Error('请填写'+label);
  const n=D(value);
  if(n.lt(min)||n.gt(max)||(integer&&!n.isInteger())||(!integer&&n.decimalPlaces()>(label==='平均缴费指数'?4:2))) throw Error(label+'超出范围或小数位过多');
  return integer?n.toNumber():n;
}
function recovery(cost,pension) { return pension && D(pension).gt(0)?cost.div(pension).ceil().toNumber():null; }
function forecast(r,now) {
  const regionId=r.regionId||'440100',local=require('./city-policies').requireEmployee(regionId,r.dataAsOf),legacy=!!local.legacy;
  if(local.nonLocalOnly&&r.szNonLocal!=='yes')throw Error('深圳目前只支持非深圳户籍且无地方补充养老权益的普通情况，请先确认；深户地方补助尚未接入');
  const today=now||new Date(), current=today.getFullYear()*12+today.getMonth();
  const b=month(r.birthMonth,'出生年月','birthMonth'),first=month(r.firstInsuredMonth,'首次参保年月','firstInsuredMonth'),asof=month(r.dataAsOf,'数据截至月份','dataAsOf');
  const ret=retirement(r.birthMonth,r.category),retMonth=month(ret.month);
  const paid=number(r.paidMonths,'累计缴费月数',0,960,true);
  if(b>first) invalid('首次参保年月'+date(first)+'早于出生年月'+date(b)+'，请重新选择首次参保年月','firstInsuredMonth');
  if(first>asof) invalid('数据截至月份'+date(asof)+'早于首次参保年月'+date(first)+'，请改为缴费记录的截至月份','dataAsOf');
  if(asof>retMonth) invalid('截至月份'+date(asof)+'已晚于法定退休年月'+date(retMonth)+'；此简易版暂不支持退休后的权益核算，请检查出生年月和人员类别','birthMonth');
  const available=asof-first+1;
  if(paid>available) invalid('从'+date(first)+'到'+date(asof)+'最多'+available+'个月，你填了'+paid+'个月。请核对累计月数；如有更早参保记录，请修改首次参保年月','paidMonths',0);
  const warnings=asof>current?['数据截至月份'+date(asof)+'晚于设备当前月份'+date(current)+'。本次按你填写的记录月份估算，请核对手机日期及缴费记录。']:[];
  if(first<1998*12+6) throw Error('1998年7月前参保可能涉及历史待遇，此简易工具暂不适用');
  if(r.historicalRights) throw Error('有视同缴费或特殊历史权益，请由社保核算，此工具暂不适用');
  const principal=number(r.principal,'已划入个人账户金额',0,100000000);
  const interest=number(r.interest,'账户利息',0,100000000,false,true)||D(0);
  const limits=contributionRange(r.dataAsOf,regionId);
  const currentBase=number(r.currentBase,'缴费基数',limits.min,limits.max,false,true)||D(limits.min);
  const historic=number(r.historicalIndex,'平均缴费指数','.0001',10,false,true)||D('.6');
  const pause=number(r.pauseMonths==null?0:r.pauseMonths,'暂停月数',0,480,true);
  const custom=number(r.customMonths==null?60:r.customMonths,'自定义月数',0,960,true);
  const type=r.contributionType||'FLEXIBLE';
  if(!['FLEXIBLE','EMPLOYEE'].includes(type)) throw Error('缴费身份无效');
  const plans=['CURRENT','MINIMUM','MINIMUM_STOP','CUSTOM'];
  if(!plans.includes(r.plan)) throw Error('请选择缴费方案');
  const parameter=legacy?policy.pensionParameters.filter(p=>p.status==='OFFICIAL'&&p.pensionBase).sort((a,b)=>b.year-a.year)[0]:{status:'OFFICIAL',year:local.year,pensionBase:local.pensionBase};
  const referenceNote=legacy?'':local.referenceText||'缴费按'+limits.effectiveFrom+'标准；待遇按'+parameter.year+'年参数，未来调整未计入。';
  const localBasic=(base,index,months)=>{
    if(legacy||local.rule==='GUANGDONG')return basic(base,index,months);
    const years=local.rule==='GUANGXI'?D(months).div(12).toDecimalPlaces(2,Decimal.ROUND_UP):D(months).div(12);
    return D(base).mul(D(1).plus(local.rule==='GUANGXI'?D(index).toDecimalPlaces(4):index)).div(2).mul(years).mul('.01');
  };
  const target=minimum(Math.floor(retMonth/12)), gap=Math.max(0,target-paid);
  const rate=type==='FLEXIBLE'?'.20':'.08';
  const scenarios=plans.map(plan=>{
    const base=plan==='CURRENT'||plan==='CUSTOM'?currentBase:D(limits.min);
    const future=plan==='CUSTOM'?custom:plan==='MINIMUM_STOP'?gap:Math.max(0,retMonth-asof-pause,gap);
    const total=paid+future,last=future?asof+pause+future:asof,eligible=Math.max(last,retMonth),age=eligible-b;
    const lo=Math.floor(age/12),hi=Math.ceil(age/12), qualified=total>=target;
    const futureIndex=legacy?D('.6').mul(base).div(5510):base.div(local.indexWage);
    const index=total?historic.mul(paid).plus(futureIndex.mul(future)).div(total):historic;
    const credit=base.mul('.08').mul(future),account=principal.plus(interest).plus(credit);
    const payment=future?base.mul(rate):D(0),cost=payment.mul(future);
    const common={plan,futureMonths:future,totalMonths:total,minimumMonths:target,lastPaymentMonth:date(last),qualified,shortMonths:Math.max(0,target-total),monthlyBase:money(base),monthlyPersonalPayment:money(payment),futurePersonalCost:money(cost),futureAccountCredit:money(credit),account:money(account)};
    if(lo<40||hi>70) return {...common,qualified:false,unsupported:true,error:'领取年龄超出40—70岁支持范围',totalLow:null,totalHigh:null};
    const bs=localBasic(parameter.pensionBase,index,total),low=account.div(policy.accountMonths[lo]),high=account.div(policy.accountMonths[hi]);
    const tl=qualified?bs.plus(low):null,th=qualified?bs.plus(high):null;
    let il=null,ih=null;
    if(qualified&&paid>=target) {
      const prior=localBasic(parameter.pensionBase,historic,paid);
      il=bs.minus(prior).plus(credit.div(policy.accountMonths[lo]));
      ih=bs.minus(prior).plus(credit.div(policy.accountMonths[hi]));
    }
    return {...common,receiptMonth:qualified?date(eligible+1):null,index:index.toFixed(4),basic:money(bs),personalLow:money(low),personalHigh:money(high),totalLow:money(tl),totalHigh:money(th),divisorRange:lo!==hi,recoveryMonthsFast:recovery(cost,th),recoveryMonthsSlow:recovery(cost,tl),incrementalLow:money(il),incrementalHigh:money(ih),incrementalRecoveryFast:recovery(cost,ih),incrementalRecoverySlow:recovery(cost,il)};
  });
  return {regionId,region:require('./city-policies').city(regionId).name,referenceNote,sources:local.sources,retirement:ret,selected:r.plan,scenarios,parameter,contributionType:type,pauseMonths:pause,warnings,limits};
}
module.exports={forecast,retirement,minimum,basic,policy};
