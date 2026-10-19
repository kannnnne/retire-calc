const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies');
const rules=require('../miniprogram/utils/local-resident-policies');
const {getRegion}=require('../miniprogram/resident/data/regions');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const documents=require('../miniprogram/utils/city-documents');
const form=(patch={})=>({regionId:'450100',localArea:'xingning',birth:'1966-10',asOf:'2026-10',years:'15',balance:'30000',pastAnnual:'200',tier:200,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',...patch});

test('兴宁区基础211、满15年月加10、65岁再加5，只对所选区生效',()=>{
 const r=calculate(form());assert.equal(r.region,'南宁市 · 兴宁区');assert.equal(r.baseYear,2025);assert.equal(r.chosen.base,'221.00');assert.equal(r.chosen.low,(221+30000/139).toFixed(2));assert.equal(r.chosen.total,'0.00');
 assert.equal(calculate(form({birth:'1961-10'})).chosen.base,'226.00');assert.equal(calculate(form({years:'20'})).chosen.base,'231.00');
 const city=calculate(form({localArea:''}));assert.equal(city.chosen.base,'186.00');assert.equal(city.referenceLabel,'南宁自治区参考 · 可选已核区县');assert.equal(calculate(form({regionId:'450400',localArea:''})).chosen.base,'186.00');
 assert.throws(()=>calculate(form({localArea:'not-a-district'})),/参保所在地/);
});

test('满15年加10是一个门槛金额，不给14年提前加、不每年重复加',()=>{
 const p=getRegion('450100','xingning');for(const [years,extra]of [[0,0],[14,0],[15,10],[16,12],[20,20],[30,40]])assert.equal(rules.tenureExtra(p,years),extra);
 for(const c of registry.cities.filter(c=>c.id!=='450100'))assert.equal(c.resident.tenureBonus,undefined,c.name);
 const r=calculate(form({years:'14'}));assert.equal(r.chosen.base,'221.00');assert.equal(r.chosen.account,'30235.00');assert.equal(r.chosen.total,'200.00');assert.equal(r.chosen.subsidy,'35.00');assert.equal(r.chosen.timeline.finalYears,15);
});

test('兴宁区15档普通缴费和广西历史提档可共存，改档不改历史余额',()=>{
 const p=getRegion('450100','xingning');assert.equal(p.tiers.length,15);
 for(const [i,tier]of p.tiers.entries()){
  const r=calculate(form({years:'14',tier})),s=r.chosen;assert.equal(r.openingAmount,'30000.00');assert.equal(s.base,'221.00');assert.equal(s.total,tier.toFixed(2));assert.equal(s.subsidy,p.subsidies[i].toFixed(2));assert.equal(s.account,(30000+tier+p.subsidies[i]).toFixed(2));
 }
 const r=calculate(form({gxScopeReviewed:'yes',gxStartYear:'2011',gxMakeupRows:[{mode:'upgrade',start:'2020',end:'2020',target:'600',original:'200',subsidyAlready:'0'}]}));assert.equal(r.makeup.cost,'400.00');assert.equal(r.makeup.addedYears,0);assert.equal(r.chosen.base,'221.00');assert.equal(r.chosen.account,'30400.00');
});

test('兴宁区原件只进入南宁居民资料，不混广东兴宁市、其他广西城市或职工',()=>{
 for(const id of ['nn-xingning-base-2025','nn-xingning-rule-2024']){const d=documents.find(d=>d.id===id);assert.deepEqual(d.cityIds,['450100']);assert.equal(d.kind,'resident');assert.match(d.publisher,/南宁市兴宁区/);assert.equal(registry.capability('441400','resident').sources.some(s=>s.id===id),false);assert.equal(registry.capability('450100','employee').sources.some(s=>s.id===id),false);}
});
