const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const documents=require('../miniprogram/utils/city-documents');
const form=(patch={})=>({regionId:'441900',birth:'1966-10',asOf:'2026-10',years:'15',balance:'30000',pastAnnual:'360',tier:360,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',...patch});

test('东莞新领取者用已核2024基础330而非省240、旧批次500或平均待遇635.89',()=>{
 const p=registry.capability('441900','resident');assert.equal(p.base,330);assert.equal(p.baseYear,2024);assert.equal(p.provincial,false);assert.match(p.referenceText,/未计尚待核实的后续调标/);
 const r=calculate(form());assert.equal(r.chosen.base,'330.00');assert.equal(r.chosen.low,(330+30000/139).toFixed(2));assert.equal(r.chosen.total,'0.00');assert.equal(r.baseYear,2024);
 const older=calculate(form({birth:'1961-10'}));assert.equal(older.chosen.base,'330.00');
 assert.equal(calculate(form({years:'20'})).chosen.base,'345.00');
});

test('东莞九档未来费用与补贴不随基础额调标改变，历史个人账户不改写',()=>{
 const p=registry.capability('441900','resident');
 for(const [i,tier] of p.tiers.entries()){
  const r=calculate(form({years:'14',tier})),s=r.chosen,grant=i<3?30:60;
  assert.equal(r.openingAmount,'30000.00');assert.equal(s.total,tier.toFixed(2));assert.equal(s.subsidy,grant.toFixed(2));assert.equal(s.account,(30000+tier+grant).toFixed(2));assert.equal(s.base,'330.00');assert.equal(s.lumpYears,0);assert.equal(s.receiptYear,2027);
 }
});

test('东莞调标证据四份同市隔离，不把2024两次各10误去重为一次',()=>{
 const ids=['dg-resident-base-2022','dg-resident-base-2023','dg-resident-base-2024-first','dg-resident-base-2024-second'];
 const p=registry.capability('441900','resident');
 for(const id of ids){const s=p.sources.find(s=>s.id===id);assert.ok(s,id);assert.equal(s.checkedAt,'2026-10-19');const d=documents.find(d=>d.id===id);assert.deepEqual(d.cityIds,['441900']);assert.equal(d.kind,'resident');assert.ok(!registry.capability('441900','employee').sources.some(s=>s.id===id));}
 assert.match(p.sources.find(s=>s.id===ids[3]).text,/合计增加20/);
 assert.equal(registry.capability('440300','resident').base,240);assert.equal(registry.capability('450100','resident').base,186);
});
