// Export actual configured fields and sources; this does not certify local policy completeness.
const fs=require('node:fs'),path=require('node:path');
const registry=require('../miniprogram/utils/resident-registry');
const profiles=require('../miniprogram/utils/national-resident-policies');
const provincial=require('../miniprogram/utils/province-policies');
const extended=require('../miniprogram/utils/extended-policies');
const makeup=require('../miniprogram/utils/resident-makeup-policies');
const {audit}=require('./audit-resident-coverage');
const labels={missing:'补实际漏年',upgrade:'补已交差额',lump:'到龄补足',transition:'原制度过渡',extension:'延缴五年后补足'};
const safe=s=>String(s??'未核').replace(/\|/g,'／').replace(/[\r\n]+/g,' ');
function fields(p){
 if(p.legacy)return '广州原模型，独立计算，不能套用其他省补缴';
 const annual=p.annualInput?'当地确认年额（未核补贴暂0）':p.continuous?'1000—9000元自选':p.tiers?.join('、')+'元';
 return `基础${p.base}元/月（${p.baseYear}）；年缴${annual}；补贴${p.annualInput||p.subsidiesKnown===false?'未核部分不计':p.continuous?'60／90／120／150元分段':p.subsidies?.join('、')+'元'}；账户${p.rule==='CHENGDU_REFERENCE'?'成都独立公式':p.ageDivisor||p.rule==='BEIJING_ORDINARY'?'按领取年龄计发':'除139'}`;
}
function report(){
 const a=audit();if(a.errors.length)throw Error(a.errors.join('\n'));
 const lines=['# 全国居民养老字段与来源表','','由当前配置生成：`node scripts/report-resident-policies.js`。来源只证明各自描述的字段，不证明每个市县完整待遇。','',
 '大陆31省级地区、369个选择项均有普通参考；166项用全国下限，66项年额须本人确认，两类重叠。共用补缴333项，其中222项仅国家原制度过渡条件参考；旧两广35项及成都1项独立路径。港澳台不在本次范围。','',
 '普通入口按尚未领取、16—70岁、正常年度缴费安排；出生/月龄、已有年数、历史本金及今年是否已缴按实际填写。补缴须额外核个人资格。未核市县加发、历史补贴利息及未来调标不自动加入。当前档次不授权倒用过去年度。具体限制见 national-makeup-progress.md。',''];
 for(const province of registry.provinces){
  const stats=a.provinceRows.find(p=>p.id===province.id),base=profiles[province.id]||({'440000':provincial.gdResident,'450000':provincial.gxResident})[province.id]||extended.provinceReferences[province.id]?.resident||province.cities[0].resident;
  lines.push(`## ${province.name}`, '', '|字段|当前实现|','|---|---|',`|覆盖|${stats.ready}/${stats.total}；全国下限${stats.limited}项；年额确认${stats.localAmount}项|`,`|省级／默认普通参数|${safe(fields(base))}|`,`|适用说明|${safe(base.referenceText||'保留本地独立模型，见下方覆盖项及来源')}|`,`|补缴分层|共用${stats.makeup}项，其中国家条件参考${stats.nationalTransition}项；个人确认不默认勾选|`);
  const routes=new Map(),sources=new Map((base.sources||[]).map(s=>[s.id,s]));
  for(const c of province.cities){
   const p=c.resident,m=makeup.get(c.id,p.rule);
   for(const s of [...(p.sources||[]),...(m?.sources||[])])sources.set(s.id,s);
   const route=m?`${m.name}：${m.modes.map(x=>labels[x]).join('／')}；${m.referenceMode==='NATIONAL_TRANSITION_ONLY'?'仅国家条件参考，地方细则未核齐':m.note}`:c.id==='510100'?'成都原到龄趸缴路径（2012年起普通记录）':c.id.startsWith('45')?'广西原漏年／提档／经办核定过渡路径':'广东原延缴／本地到龄补足路径，历史补漏具体年度先核定';
   if(!routes.has(route))routes.set(route,[]);routes.get(route).push(c.name);
  }
  for(const [route,cities]of routes)lines.push(`|补缴范围：${safe(cities.join('、'))}|${safe(route)}|`);
  for(const c of province.cities){const p=c.resident;if(p===base||p.scope==='PROVINCE_REFERENCE'&&!p.areas?.length&&!p.legacy)continue;
   lines.push(`|本地覆盖：${safe(c.name)}|${safe(fields(p))}；${safe(p.referenceLabel||'原模型')}|`);
   for(const area of p.areas||[])if(area.policy)lines.push(`|${safe(c.name+' · '+area.name)}|${safe(fields({...p,...area.policy}))}；${safe(area.policy.referenceText||'本地参数覆盖')}|`);
  }
  if(province.id==='650000')lines.push(`|兵团独立普通参考|${safe(fields(profiles.XJBT))}；不使用自治区185元及其档表|`);
  lines.push('','来源（实际字段和适用范围以原文及配置说明为准）：','');
  for(const s of sources.values())lines.push(`- [${safe(s.name)}](${s.url})：${safe(s.text)}`);
  lines.push('');
 }
 return {markdown:lines.join('\n'),audit:a};
}
if(require.main===module){const r=report();fs.writeFileSync(path.join(__dirname,'../docs/national-policy-matrix.md'),r.markdown+'\n');console.log('已生成31省字段/来源表；审计0错误，国家条件参考单独标记。');}
module.exports={report};
