const test=require('node:test'),assert=require('node:assert/strict');
const {audit}=require('../scripts/audit-resident-coverage'),{report}=require('../scripts/report-resident-policies');
const registry=require('../miniprogram/utils/resident-registry'),makeup=require('../miniprogram/utils/resident-makeup-policies');
const {calculate}=require('../miniprogram/resident/utils/calculate');
test('全国字段来源表从真实省配置生成，31份都有范围且省表不冒用首个城市参数',()=>{
 const {markdown,audit:a}=report();assert.equal(a.ready,369);assert.equal(a.makeup+36,a.ready);assert.equal((markdown.match(/^## /gm)||[]).length,31);assert.ok(!/undefined|NaN/.test(markdown));
 for(const p of registry.provinces){const section=markdown.split('## '+p.name+'\n')[1]?.split('\n## ')[0];assert.ok(section,p.name);for(const word of ['省级／默认普通参数','适用说明','来源（','补缴分层'])assert.ok(section.includes(word),p.name+word);assert.ok(/https?:/.test(section),p.name);}
 const gd=markdown.split('## 广东省\n')[1].split('\n## ')[0];assert.ok(gd.includes('|省级／默认普通参数|基础240元/月（2025）；年缴180、240、360'));assert.ok(gd.includes('本地覆盖：深圳市'));assert.ok(gd.includes('本地覆盖：广州市'));assert.ok(markdown.includes('兵团独立普通参考'));assert.ok(markdown.includes('222项仅国家原制度过渡条件参考'));
});
test('监测会发现补缴策略丢失，不把普通可算当作补缴路径也齐全',()=>{
 const saved=makeup.get;makeup.get=(id,rule)=>id==='320100'?null:saved(id,rule);try{assert.ok(audit().errors.includes('缺少补缴条件路径 320100'));assert.throws(()=>report(),/缺少补缴条件路径/);}finally{makeup.get=saved;}assert.deepEqual(audit().errors,[]);
});
test('全国369项均拒绝把另一地区的核定方案带入，不依赖UI清理',()=>{
 for(const c of registry.cities){const p=c.resident,f={regionId:c.id,birth:'1967-10',asOf:'2026-10',years:'5',pastAnnual:'360',balance:'',tier:p.legacy?360:p.annualInput?1000:p.tiers[0],localAnnualConfirmed:'yes',eligible:'yes',ordinary:'yes',transition:'no',paidThisYear:'yes',extended:'yes',receiving:'no',cdResidence:'rural'};
  f.approvedPlan={regionId:'foreign-region',birth:f.birth,asOf:f.asOf,paidYears:'5',mode:'transition',schemeStart:'2012-01',requiredYears:'15',annual:'300',confirmed:'yes',transitionReviewed:'yes'};
  assert.throws(()=>calculate(f),/参保信息已改变|不能套用|尚未接入/,c.id+' '+c.name);
 }
});
