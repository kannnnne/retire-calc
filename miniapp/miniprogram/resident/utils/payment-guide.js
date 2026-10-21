// Shared provincial routes. This describes choices, never grants eligibility.
function build(policy,form,result){
 if(!policy||!result)return null;
 const id=String(form.regionId),s=result.chosen,missing=Math.max(0,15-Number(result.paidYears));
 if(!id.startsWith('44')&&!id.startsWith('45')){const rule=require('../../utils/resident-makeup-policies').get(id,policy.rule);if(!rule)return null;return {province:rule.name,sourceId:rule.sources[0].id,rows:rule.modes.map(mode=>({id:mode,title:mode==='lump'?'到60岁补足年限':mode==='missing'?'补以前漏交的年份':'提高以前已交的金额',text:mode==='lump'?'补足费用按社保核定单价计算，不自动加补贴。':mode==='upgrade'?'只补原金额与核定目标金额的差额，已交年数不变。':'只补社保确认可补的漏缴年度；今年未缴在填写页选择。',action:'填写核定方案',mode:'approved'})),note:rule.note};}
 if(id.startsWith('45'))return {province:'广西',sourceId:'gx-resident-makeup-2023',rows:[
  {id:'missing',title:'补以前漏交的年份',text:'按漏交那一年的档次补，不超过当年最高档；旧年补缴没有政府补贴。',action:'选择漏交年份',mode:'missing'},
  {id:'upgrade',title:'补以前低档的差额',text:'已交年数不变，按原年度允许的高档补差额；旧年无补贴，今年只补应享补贴的差额。',action:'填写原缴费记录',mode:'upgrade'},
  {id:'transition',title:'满60岁一次补足',text:'只适用于原制度实施时距60岁不足15年、按规定逐年交到60岁的人员；按当前年档补核定缺年，有补贴。不是人人60岁都能补。',action:result.age>=60&&!form.never&&missing>0?'填写社保确认的年数':'',mode:'confirmed'}],note:form.never?'先办理参保登记，再确认哪些以前年度可以补。':'补缴先由社保审核，再到税务缴费。'};
 const local60=policy.rule==='ZHUHAI_ORDINARY';
 const rows=[{id:'extension',title:local60?'满60岁可申请补足':'先逐年交，65岁仍不足再补',text:local60?'珠海按本地办法申请补足15年，补缴没有政府补贴；档次和办理月份由社保确认。':'按省办法，60岁未交够可继续逐年交；逐年交到65岁仍不足，再一次补到规定年限，补足没有政府补贴。'}];
 if(s.lumpYears)rows[0].quote='当前方案：'+s.timeline.lumpAge+'岁补'+s.lumpYears+'年，共'+Math.round(Number(s.lumpCost))+'元。展开下方金额，可比较不同档次。';
 rows.push({id:'missing',title:'以前断过缴，也可以申请补',text:'省办法允许按规定补中断缴费年度，补缴部分无政府补贴；先确认哪些年能补、用哪个档，不能按缺几年直接买几年。'});
 rows.push({id:'upgrade',title:'想提高每月领取金额',text:policy.rule==='GUANGZHOU_2021'?'可提高以后年度档次；广州原历史提档办理期限已过，本页不生成旧年任意提档方案。':'先比较以后缴费或到龄补足的档次。省办法不等于允许任意提高过去已交年份，旧年提档需当地明确允许。'});
 return {province:'广东',sourceId:local60?'zh-resident-renewal-2026':'gd-resident-rule',rows,note:form.never?'先登记参保；到龄补足仍须符合相应条件。':'老制度过渡、具体可补年度及办理期限按个人记录由社保确认。'};
}
function canCompare(s){return !!s&&(s.timeline.normalYears>0&&s.timeline.futureNormalYears!==0||s.lumpYears>0);}
module.exports={build,canCompare};
