const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies');
const documents=require('../miniprogram/utils/city-documents');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const form=(patch={})=>({regionId:'450700',birth:'1966-10',asOf:'2026-10',years:'15',balance:'30000',pastAnnual:'200',tier:200,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',...patch});

test('钦州2026官方答复确认本地186及65岁191，仍标实际2025标准且不冒充县区完整额',()=>{
 const p=registry.capability('450700','resident');assert.equal(p.provincial,false);assert.equal(p.base,186);assert.equal(p.baseYear,2025);assert.match(p.referenceLabel,/钦州2026答复/);assert.match(p.referenceText,/未计未核实的市县/);
 for(const [birth,years,want] of [['1966-10','15',186],['1961-10','15',191],['1966-10','20',196],['1961-10','20',201]]){
  const r=calculate(form({birth,years}));assert.equal(r.chosen.base,want.toFixed(2));assert.equal(r.chosen.low,(want+30000/139).toFixed(2));assert.equal(r.chosen.total,'0.00');assert.equal(r.openingAmount,'30000.00');
 }
});

test('钦州15档正常缴费和补贴与本地基础额核对独立，继续缴费不添加云浮50元',()=>{
 const p=registry.capability('450700','resident');
 for(const [i,tier] of p.tiers.entries()){
  const normal=calculate(form({years:'14',tier})).chosen;assert.equal(normal.total,tier.toFixed(2));assert.equal(normal.subsidy,p.subsidies[i].toFixed(2));assert.equal(normal.account,(30000+tier+p.subsidies[i]).toFixed(2));assert.equal(normal.receiptYear,2027);assert.equal(normal.base,'186.00');
  const continued=calculate(form({birth:'1971-10',tier,payUntil:'SIXTY'})).chosen;assert.equal(continued.timeline.normalYears,4);assert.equal(continued.base,'194.00');assert.equal(continued.total,(tier*4).toFixed(2));assert.equal(continued.subsidy,(p.subsidies[i]*4).toFixed(2));
 }
});

test('钦州到龄补足答复不被误用为任意当前高档购买缺年限，历史提档仍按年度上限',()=>{
 const p=registry.capability('450700','resident');assert.ok(!p.lumpAt60);assert.match(p.sources.find(s=>s.id==='qz-resident-scope-2026').text,/任意当前高档乘缺年数/);
 const ordinary=calculate(form({years:'5',tier:6000}));assert.equal(ordinary.chosen.lumpYears,0);assert.equal(ordinary.chosen.timeline.normalYears,10);assert.equal(ordinary.chosen.receiptYear,2036);
 assert.throws(()=>calculate(form({years:'5',gxStartYear:'2012',gxScopeReviewed:'yes',gxMakeupRows:[{mode:'upgrade',start:'2018',end:'2018',original:200,target:6000}]})),/2018年的原档或目标档/);
});

test('钦州三份答复与桂林最新问答各自隔离，旧桂林城区档次不覆盖当前补贴',()=>{
 for(const [id,city] of [['qz-resident-base-2026','450700'],['qz-resident-continue-2025','450700'],['qz-resident-scope-2026','450700'],['gl-resident-current-2025','450300']]){
  const d=documents.find(d=>d.id===id);assert.deepEqual(d.cityIds,[city]);assert.equal(d.kind,'resident');assert.match(d.url,/zskDetail/);
  const s=registry.city(city).resident.sources.find(s=>s.id===id);assert.equal(s.checkedAt,'2026-10-19');assert.match(s.publisher,city==='450700'?/钦州市/:/桂林市/);
  for(const c of registry.cities){assert.equal(c.employee.sources.some(s=>s.id===id),false);if(c.id!==city)assert.equal(c.resident.sources.some(s=>s.id===id),false);}
 }
 const gl=registry.city('450300').resident;assert.equal(gl.provincial,true);assert.equal(gl.tiers.length,15);assert.equal(gl.subsidies[0],35);assert.equal(gl.base,186);assert.match(gl.sources.find(s=>s.id==='gl-resident-current-2025').text,/自治区2025年7月最低186/);
});

test('广西2014实施办法原件覆盖14市居民，仅作已核适用条款，不倒用旧档次',()=>{
 const id='gx-resident-original-2014',d=documents.find(d=>d.id===id);assert.equal(d.cityIds.length,14);assert.equal(d.kind,'resident');assert.match(d.publisher,/人民政府办公厅/);
 for(const c of registry.cities){const s=c.resident.sources.find(s=>s.id===id);if(c.provinceId==='450000'){assert.ok(s,c.name);assert.equal(s.checkedAt,'2026-10-19');assert.match(s.text,/第二十二条/);assert.equal(c.resident.tiers[0],200);}else assert.equal(s,undefined,c.name);assert.equal(c.employee.sources.some(s=>s.id===id),false);}
});
