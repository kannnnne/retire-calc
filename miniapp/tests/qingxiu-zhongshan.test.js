const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies');
const {getRegion}=require('../miniprogram/resident/data/regions');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const documents=require('../miniprogram/utils/city-documents');
const form=(patch={})=>({regionId:'450100',localArea:'qingxiu',birth:'1966-10',asOf:'2026-10',years:'15',balance:'30000',pastAnnual:'200',tier:200,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',transition:'no',...patch});

test('青秀用本地长缴4元，不继承兴宁满15加10或完整基础211',()=>{
 for(const [years,base] of [['15',186],['16',190],['20',206]]){
  const r=calculate(form({years}));assert.equal(r.chosen.base,base.toFixed(2));assert.equal(r.chosen.low,(base+30000/139).toFixed(2));assert.equal(r.chosen.total,'0.00');assert.match(r.referenceLabel,/基础额按广西标准/);assert.match(r.referenceText,/不等于青秀完整待遇/);
 }
 const p=getRegion('450100','qingxiu');assert.equal(p.provincial,true);assert.equal(p.tenureBonus,undefined);assert.equal(p.base,186);assert.equal(p.extraYear,4);
 assert.equal(calculate(form({birth:'1961-10',years:'20'})).chosen.base,'211.00');assert.equal(calculate(form({localArea:'xingning',years:'20'})).chosen.base,'231.00');assert.equal(calculate(form({localArea:'',years:'20'})).chosen.base,'196.00');
});

test('青秀15档缴满后长缴只加一次，不改历史账户，来源限定南宁居民',()=>{
 const p=getRegion('450100','qingxiu');
 for(const [i,tier]of p.tiers.entries()){const r=calculate(form({years:'14',tier}));assert.equal(r.chosen.base,'186.00');assert.equal(r.chosen.total,tier.toFixed(2));assert.equal(r.chosen.subsidy,p.subsidies[i].toFixed(2));assert.equal(r.chosen.account,(30000+tier+p.subsidies[i]).toFixed(2));}
 const d=documents.find(d=>d.id==='nn-qingxiu-rule-2024');assert.deepEqual(d.cityIds,['450100']);assert.equal(d.kind,'resident');assert.match(d.publisher,/青秀区人民政府/);assert.match(d.sections[0].text,/12月18日/);
});

test('中山240元由2026官方图解确认，九档补贴和年龄加发仍独立计算',()=>{
 const p=getRegion('442000');assert.equal(p.base,240);assert.equal(p.baseYear,2026);assert.equal(p.provincial,false);assert.match(p.referenceText,/不表示2026新增调标/);
 for(const [i,tier] of p.tiers.entries()){
  const r=calculate(form({regionId:'442000',localArea:'',tier,years:'14'}));assert.equal(r.chosen.base,'240.00');assert.equal(r.chosen.total,tier.toFixed(2));assert.equal(r.chosen.subsidy,p.subsidies[i].toFixed(2));
 }
 assert.equal(calculate(form({regionId:'442000',localArea:'',tier:360,years:'20'})).chosen.base,'255.00');
 assert.equal(calculate(form({regionId:'442000',localArea:'',tier:360,birth:'1961-10',years:'15'})).chosen.base,'250.00');
 const d=documents.find(d=>d.id==='zs-resident-base-2026-guide');assert.deepEqual(d.cityIds,['442000']);assert.equal(d.kind,'resident');assert.match(d.publisher,/中山市人力资源/);assert.equal(registry.capability('442000','employee').sources.some(s=>s.id===d.id),false);
});
