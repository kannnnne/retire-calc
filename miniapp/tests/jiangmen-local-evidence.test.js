const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies'),documents=require('../miniprogram/utils/city-documents');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const form=(patch={})=>({regionId:'440700',birth:'1966-10',asOf:'2026-10',years:'15',balance:'30000',pastAnnual:'360',tier:360,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',...patch});
test('鹤山当前披露只核本地基础，困难代缴120元不混入普通缴费和月领金额',()=>{
 const p=registry.capability('440700','resident');
 const disclosure=p.sources.find(s=>s.id==='hs-resident-disclosure-2025');
 assert.match(disclosure.text,/2026年4月23日/);assert.match(disclosure.text,/2025年7月1日/);assert.match(disclosure.text,/242.5元／月/);
 const aid=p.sources.find(s=>s.id==='hs-resident-special-aid-2025');
 assert.match(aid.text,/第52项/);assert.match(aid.text,/仅限列明的困难群体/);assert.match(aid.text,/不是月养老金加发/);assert.match(aid.text,/不把代缴款作为本人费用/);
 for(const s of [disclosure,aid]){
  assert.deepEqual(documents.find(d=>d.id===s.id).cityIds,['440700']);
  assert.equal(s.checkedAt,'2026-10-20');
  for(const c of registry.cities){assert.equal(c.employee.sources.some(x=>x.id===s.id),false);if(c.id!=='440700')assert.equal(c.resident.sources.some(x=>x.id===s.id),false);}
 }
 // 困难代缴资料只用于说明范围，普通年缴仍按下限参考，历史已知账户不重加补贴。
 const s=calculate(form({birth:'1971-10',years:'14',tier:180})).chosen;
 assert.equal(s.total,'180.00');assert.equal(s.subsidy,'30.00');assert.equal(s.account,'30210.00');assert.equal(s.base,'242.50');
 assert.equal(s.low,(242.5+30210/139).toFixed(2));
});
test('江门2026公布的2025年度披露只确认全市基础额，不等同本年调标或区县补贴已核',()=>{
 const p=registry.capability('440700','resident');assert.equal(p.base,242.5);assert.equal(p.baseYear,2025);assert.equal(p.provincial,false);assert.match(p.referenceLabel,/补贴下限参考/);assert.match(p.referenceText,/当前额待核/);assert.match(p.referenceText,/开平2025/);
 const s=p.sources.find(s=>s.id==='jm-resident-disclosure-2025');assert.match(s.text,/2026年4月28日/);assert.match(s.text,/2025年7月1日/);assert.match(s.text,/未披露各区县当前缴费补贴/);
 const history=p.sources.find(s=>s.id==='jm-resident-subsidy-history-2023');assert.match(history.text,/低三档补120元/);assert.match(history.text,/不把2023执行数直接当2026现行数/);
});
test('江门新增当前披露和历史补贴资料只进入本市居民入口',()=>{
 for(const id of ['jm-resident-disclosure-2025','jm-resident-subsidy-history-2023']){
  const d=documents.find(d=>d.id===id);assert.deepEqual(d.cityIds,['440700']);assert.equal(d.kind,'resident');assert.match(d.publisher,/江门市社会保险基金管理局/);
  assert.equal(registry.capability('440700','resident').sources.find(s=>s.id===id).checkedAt,'2026-10-20');
  for(const c of registry.cities){assert.equal(c.employee.sources.some(s=>s.id===id),false);if(c.id!=='440700')assert.equal(c.resident.sources.some(s=>s.id===id),false);}
 }
});
test('江门九档下限补贴维持静态参考，不把历史120／150补贴重复塞入已知余额',()=>{
 const tiers=[180,240,360,600,900,1200,1800,3600,4800];
 for(const [i,tier]of tiers.entries()){
  const r=calculate(form({birth:'1971-10',years:'14',tier})),s=r.chosen,grant=i<3?30:60;
  assert.equal(r.openingAmount,'30000.00');assert.equal(s.total,tier.toFixed(2));assert.equal(s.subsidy,grant.toFixed(2));assert.equal(s.account,(30000+tier+grant).toFixed(2));assert.equal(s.base,'242.50');assert.equal(s.low,(242.5+(30000+tier+grant)/139).toFixed(2));assert.match(r.referenceLabel,/下限参考/);assert.ok(r.warnings.some(s=>s.includes('蓬江、江海、新会、鹤山')));
 }
 assert.throws(()=>calculate(form({localArea:'heshan'})),/没有这个参保分区/);
});
test('江门直接披露的基础额不改变已缴金额及长缴规则，不由2023区县差异推补缴资格',()=>{
 const s=calculate(form({years:'20'})).chosen;assert.equal(s.base,'257.50');assert.equal(s.total,'0.00');assert.equal(s.account,'30000.00');
 const late=calculate(form({years:'5'})).chosen;assert.equal(late.timeline.lumpAge,65);assert.equal(late.lumpYears,6);assert.equal(late.subsidy,'120.00');
 assert.throws(()=>calculate(form({birth:'1961-10',years:'5'})),/确认已按规定延缴/);
});
