const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/resident-registry'),{calculate}=require('../miniprogram/resident/utils/calculate');
const cases=[
 ['140000',11,143,[200,300,500,700,1000,1500,2000,3000,4000,5000],[35,40,60,80,100,140,180,220,260,300]],
 ['150000',12,197,[200,300,400,500,600,700,800,900,1000,3000,5000,7000],[35,40,45,60,65,70,75,80,85,90,95,100]],
 ['220000',9,143,[200,300,500,1000,1500,2000,3000,4000,5000],[40,50,70,120,145,170,170,170,170]],
 ['230000',13,163,[200,300,400,500,600,800,1000,1500,2000,3000,4000,5000],[40,50,60,70,70,70,70,100,120,140,140,140]]
];
const form=patch=>({birth:'1971-10',asOf:'2026-10',years:'5',pastAnnual:'360',balance:'',never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',...patch});
test('四省45项全部档次独立核算费用、补贴、起领年龄和金额',()=>{let count=0;for(const[id,size,base,tiers,subs]of cases){const p=registry.provinces.find(x=>x.id===id);assert.equal(p.cities.length,size);count+=size;for(const c of p.cities){assert.deepEqual(c.resident.tiers,tiers);for(let i=0;i<tiers.length;i++){const r=calculate(form({regionId:c.id,tier:tiers[i]}));assert.equal(r.chosen.total,(tiers[i]*10).toFixed(2));assert.equal(r.chosen.subsidy,(subs[i]*10).toFixed(2));assert.equal(r.chosen.low,(base+(1800+10*(tiers[i]+subs[i]))/139).toFixed(2));assert.equal(r.chosen.timeline.receivingAge,65);assert.equal(r.chosen.lumpYears,0);}assert.equal(registry.capability(c.id,'employee'),null);}}assert.equal(count,45);});
test('吉林剔除困难100及旧普通400档，不给过去固定缴费虚增新补贴',()=>{for(const tier of [100,400,600,700,800,900])assert.throws(()=>calculate(form({regionId:'220100',tier})),/当地缴费档次/);const r=calculate(form({regionId:'220100',tier:5000}));assert.equal(r.chosen.subsidy,'1700.00');assert.match(registry.city('220100').resident.referenceText,/历史补缴不倒套/);});
test('山西基本养老不混入补充养老，内蒙古不借地方2000元增档',()=>{assert.equal(calculate(form({regionId:'140100',tier:500})).chosen.subsidy,'600.00');assert.match(registry.city('140100').resident.referenceText,/不混入补充养老/);assert.equal(calculate(form({regionId:'140100',tier:1500})).chosen.subsidy,'1400.00');assert.throws(()=>calculate(form({regionId:'150100',tier:2000})),/当地缴费档次/);});
test('山西吉林明确下限，内蒙古黑龙江保留已核省级金额与各自来源',()=>{for(const[id,,,]of cases){const p=registry.provinces.find(x=>x.id===id).cities[0].resident;if(['140000','220000'].includes(id))assert.equal(p.parameterStatus,'NATIONAL_FLOOR_REFERENCE');else assert.equal(p.parameterStatus,undefined);assert.ok(p.sources.every(s=>!s.publisher.includes('福建')));}});
