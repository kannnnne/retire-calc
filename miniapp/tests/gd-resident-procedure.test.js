const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies');
const {getRegion}=require('../miniprogram/resident/data/regions');
const documents=require('../miniprogram/utils/city-documents');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const sourceId='gd-resident-procedure-2025';

test('广东2025经办规程覆盖21市居民资料，广州旧模型也可查看，不能串入广西或职工',()=>{
 const cities=registry.cities.filter(c=>c.provinceId==='440000');assert.equal(cities.length,21);
 for(const c of registry.cities){
  assert.equal(c.resident.sources.filter(s=>s.id===sourceId).length,c.provinceId==='440000'?1:0,c.name);
  assert.equal(c.employee.sources.filter(s=>s.id===sourceId).length,0,c.name);
 }
 for(const c of cities){const s=getRegion(c.id).sources.find(s=>s.id===sourceId);assert.ok(s,c.name);assert.match(s.text,/符合领取条件次月/);assert.match(s.text,/没有另行开放/);assert.equal(s.checkedAt,'2026-10-19');}
 const d=documents.find(d=>d.id===sourceId);assert.equal(d.kind,'resident');assert.equal(d.cityIds.length,21);assert.match(d.publisher,/惠州市人社局/);assert.match(d.url,/5563290/);
});

test('两广35市：年底达到年龄与缴费条件，下一年才起领，不在生日之前领',()=>{
 const cities=registry.cities.filter(c=>['440000','450000'].includes(c.provinceId));assert.equal(cities.length,35);
 for(const c of cities){
  const tier=getRegion(c.id).tiers[0];
  const r=calculate({regionId:c.id,birth:'1966-12',asOf:'2026-10',years:'15',budget:'',usedSubsidy:'',balance:'30000',pastAnnual:'360',tier,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',transition:'no'});
  assert.equal(r.chosen.receiptYear,2027,c.name);assert.equal(r.chosen.total,'0.00',c.name);assert.equal(r.chosen.lumpYears,0,c.name);
 }
});

test('广东普通延缴不能因经办规程换新就自动变成60岁一次补足',()=>{
 for(const c of registry.cities.filter(c=>c.provinceId==='440000'&&!['440100','440400'].includes(c.id))){
  const r=calculate({regionId:c.id,birth:'1966-12',asOf:'2026-10',years:'5',balance:'1800',pastAnnual:'360',tier:getRegion(c.id).tiers[0],never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',transition:'no'});
  assert.ok(r.chosen.receiptYear>=2031,c.name);assert.equal(r.chosen.timeline.lumpAge,65,c.name);assert.ok(r.chosen.lumpYears>0,c.name);
 }
});

test('广州正常缴满和65岁补足均按条件齐备次月跨年，领取周岁不随跨年多算一岁',()=>{
 const f={regionId:'440100',birth:'1966-12',asOf:'2026-12',years:'14',balance:'30000',pastAnnual:'360',budget:'',usedSubsidy:'',tier:360,never:false,paidThisYear:'no',eligible:'yes',transition:'no'};
 const normal=calculate(f).chosen;assert.equal(normal.receiptYear,2027);assert.equal(normal.timeline.receivingAge,60);assert.equal(normal.timeline.normalYears,1);assert.equal(normal.lumpYears,0);
 const lump=calculate({...f,years:'5',paidThisYear:'yes'}).chosen;assert.equal(lump.timeline.lumpMonth,'2031-12');assert.equal(lump.receiptYear,2032);assert.equal(lump.timeline.receivingAge,65);assert.equal(lump.lumpYears,6);
 const january=calculate({...f,birth:'1966-01',asOf:'2026-01',years:'15',paidThisYear:'yes'}).chosen;assert.equal(january.receiptYear,2026);assert.equal(january.timeline.receivingAge,60);
});
