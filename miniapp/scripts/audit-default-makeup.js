// Audit real default Page flows; late receipt is a review candidate, not proof of a policy bug.
const fs=require('node:fs'),path=require('node:path');
const registry=require('../miniprogram/utils/resident-registry'),rules=require('../miniprogram/utils/resident-makeup-policies');
const reviewed=require('../miniprogram/resident/utils/default-makeup-policies');
const {page}=require('./resident-module-harness');
const rows=[];
for(const province of registry.provinces)for(const city of province.cities){
 const rule=rules.get(city.id,city.resident.rule),cases=[];
 for(const age of [55,60,65]){
  const q=page('basic');q.onLoad();q.regionChoice({detail:{regionId:city.id}});
  q.setData({'form.age':String(age),'form.asOf':'2026-10',...(city.resident.annualInput?{'form.tier':500}:{})});q.calculate();
  const r=q.data.result,s=r?.chosen;
  cases.push({age,error:s?null:q.data.error||'no result',receivingAge:s?.timeline?.receivingAge,receiptMonth:s?.receiptMonth,autoPlan:r?.autoPlan?.title||null,limited:!!r?.autoPlan?.limited,lumpYears:s?.lumpYears||0,makeupYears:r?.makeup?.addedYears||0});
 }
 rows.push({province:province.name,id:city.id,name:city.name,policyRule:city.resident.rule,reviewedDefault:reviewed.get(city.id)?.mode||null,modes:rule?.modes||[],referenceMode:rule?.referenceMode||null,validThrough:rule?.validThrough||null,cases});
}
const grouped={};for(const row of rows){const key=[row.province,row.policyRule,row.modes.join(','),row.referenceMode,row.cases.map(c=>c.error?'ERROR':c.receivingAge).join('/')].join('|');(grouped[key]||=([])).push(row);}
const groups=Object.values(grouped).map(list=>({province:list[0].province,rule:list[0].policyRule,modes:list[0].modes,referenceMode:list[0].referenceMode,count:list.length,example:list[0].name,id:list[0].id,ages:list[0].cases.map(c=>c.error?'ERROR':c.receivingAge).join('/'),errors:list[0].cases.filter(c=>c.error).map(c=>c.error)}));
const report={asOf:'2026-10',note:'Zero paid years; ages 55/60/65; 500 annual input where local price is unspecified. Late receipt flags review, not a finding that makeup is legally unavailable.',regions:rows.length,caseCount:rows.length*3,errorCases:rows.flatMap(r=>r.cases).filter(c=>c.error).length,groups,rows};
fs.mkdirSync(path.join(__dirname,'../output'),{recursive:true});fs.writeFileSync(path.join(__dirname,'../output/default-makeup-audit.json'),JSON.stringify(report,null,2));
if(process.argv.includes('--write-docs')){
 const reasons={
 '11':'只新增符合2009年龄界限且2015以后参保组；55/60岁样例不能由现有输入认定迁京身份，60岁样例仍超现有计发月数范围',
 '12':'已新增到龄补足，所选年额参考费用',
 '13':'补缴存在，但原年度档次/当地可补范围未齐；未按当前8000档倒套旧年',
 '14':'沿用2.47已接入60岁补足',
 '15':'已新增60岁以上未参保一次补缴，费用按所选年额参考',
 '21':'已新增2014年起补漏，2019前最高2000、2019起最高3000；更早年度未接，60/65岁0年样例仍是保守62/67岁',
 '22':'已新增2014年起补漏，2024及以前最高省定2000；更早年度未接，地方增档未扩用',
 '23':'有一次补缴办事指南，但原制度条件及适用单价未齐，未推为人人60岁补足',
 '31':'2024现行问答要求60岁不足最低年限继续逐年缴；未套2019已过期问答，补漏所需首次参保/历史年度不足',
 '32':'仅苏州新增到龄补足；其他12项仍需当地条款及补价，盐城等答复不能扩作全省统一办法',
 '33':'原制度/首次参保时间分组与地方补价未齐；未把地方文件套全省',
 '34':'已有官方答复口径有适用组差异；原制度/年数和补价未齐，不能仅凭60岁强行补15年',
 '35':'旧十四五超龄参保答复标失效，未外推到2026；现行申领指南未给完整补足报价规则',
 '36':'仅南昌新增；其余10项未将单市问答扩为全省补缴实施细则',
 '37':'沿用2.47已接入到龄补足',
 '41':'已新增到龄补足，省经办规程规定按补缴当年标准、补费无政府补贴',
 '42':'已核2023缴费政策说明补费无补贴，但本地补足条件/年额动态范围仍未齐',
 '43':'原制度时年龄、可补年数及历史范围与普通漏年须分开；未由现在年龄直接认定',
 '44':'沿用原有本地规则；珠海60、省/广州65等不混用；佛山湛江茂名缺今年实际档属于需输入不是算错',
 '45':'沿用2.47自动补往年，不回退仅逐年',
 '46':'沿用延缴5年且65岁后补足；65岁0年者仍需5年，不删除真实延缴要求',
 '50':'2026问答禁止重缴已缴年度；旧年度漏年价格/试点日期未齐，不以当前档倒套或擅自提档',
 '51':'成都原规则保留；其他20项补足仍在2026-11有效期内适用，2031到龄不假设续期',
 '52':'已有指南待补足适用条件和单价核读；未把报道中的个人成功案例扩作省级通用规则',
 '53':'省办法区分59岁过渡补缴（可能有补贴）和中断补缴，未把全部补费设0补贴或人人60岁补15年',
 '54':'省实施办法有原制度过渡补缴且涉及补贴，原制度日期/所需年数未齐；不能套全国0补贴模板',
 '61':'到龄不足可补及次月发放有来源，但原年度补价/适用年数未齐；系统延迟的特别补发不推广普通人',
 '62':'已新增符合条件者按当前档补2014年起漏年；更早范围未接，保守参考明确标识',
 '63':'已有补缴申报渠道，但仅说明经办核金额，未齐可补起点/单价，不捏造到龄补15年',
 '64':'特殊困难人群补足不能当普通人规则；普通补价/可补年限未齐',
 '65':'仅乌鲁木齐新增有效期内补2014年起漏年，可选当前档；其他13项和兵团12项不借乌市权限'
 };
 const quote=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
 const csv=[['省份','地区代码','地区','本轮默认路径','55岁0年起领','60岁0年起领','65岁0年起领','处理说明'],...rows.map(r=>[r.province,r.id,r.name,r.reviewedDefault||'沿用原有规则/待补关键条款',...r.cases.map(c=>c.error?'需补输入或超模型范围':c.receivingAge+'岁'+(c.limited?'（未含更早年度）':'')),reasons[r.id.slice(0,2)]])].map(r=>r.map(quote).join(',')).join('\r\n');
 fs.writeFileSync(path.join(__dirname,'../docs/default-makeup-coverage.csv'),'\uFEFF'+csv);
}
console.log(JSON.stringify({...report,rows:undefined},null,2));
