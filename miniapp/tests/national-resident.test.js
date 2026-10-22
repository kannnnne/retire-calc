const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const national=require('../miniprogram/utils/resident-registry'),legacy=require('../miniprogram/utils/city-policies'),audit=require('../scripts/audit-resident-coverage').audit,{calculate}=require('../miniprogram/resident/utils/calculate');
function page(relative='resident/pages/calc/calc.js'){let def;const file=path.join(__dirname,'../miniprogram',relative);vm.runInNewContext(fs.readFileSync(file,'utf8'),{Date,JSON,Page:x=>def=x,wx:{pageScrollTo(){},showModal(){},navigateTo(){}},require:x=>require(path.resolve(path.dirname(file),x))});return {...def,data:JSON.parse(JSON.stringify(def.data)),setData(values){for(const[k,v]of Object.entries(values)){const keys=k.split('.');let d=this.data;for(const key of keys.slice(0,-1))d=d[key];d[keys.at(-1)]=v;}}};}
const form=(patch={})=>({regionId:'350100',birth:'1971-10',asOf:'2026-10',years:'5',pastAnnual:'360',balance:'',tier:200,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',...patch});
test('全国居民注册与审计：31省、无重复行政码，来源与档次补贴完整，旧规则不被覆盖',()=>{const report=audit();assert.deepEqual(report.errors,[]);assert.equal(report.provinces,31);assert.ok(report.selectionEntries>350);assert.ok(report.ready>=68);assert.equal(report.ready+report.pending,report.selectionEntries);assert.equal(legacy.cities.length,40);assert.ok(!national.provinces.some(p=>['710000','810000','820000'].includes(p.id)));});
test('省直辖县级市可选择，直辖市不显示市辖区虚假城市，普通城市不漏',()=>{for(const [id,name]of [['419001','济源市'],['429004','仙桃市'],['659001','石河子市'],['120100','天津市'],['500100','重庆市'],['350200','厦门市']])assert.equal(national.city(id).name,name);for(const p of national.provinces)assert.ok(!p.cities.some(c=>/省直辖|自治区直辖|市辖区/.test(c.name)));});
test('福建九市复用同一省级12档与139公式，地方额外提高不冒充已核',()=>{const fj=national.provinces.find(p=>p.id==='350000');assert.equal(fj.cities.length,9);for(const c of fj.cities){const p=c.resident,r=calculate(form({regionId:c.id}));assert.equal(p.base,190);assert.equal(r.chosen.low,(190+(1800+2000+400)/139).toFixed(2));assert.equal(r.chosen.total,'2000.00');assert.equal(r.chosen.timeline.receivingAge,65);assert.equal(r.chosen.lumpYears,0);assert.ok(r.referenceLabel.includes('省级参考'));assert.equal(national.capability(c.id,'employee'),null);}});
test('福州真实页面默认可算、修改重算，切需本地金额确认省份清结果且不借福建档次',()=>{const p=page();p.regionChoice({detail:{regionId:'350100'}});p.setData({'form.asOf':'2026-10','form.age':'55','form.years':'5','form.pastAnnual':'360'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.regionId,'350100');p.chooseFuture({currentTarget:{dataset:{annual:3000}}});assert.equal(p.data.form.tier,3000);p.regionChoice({detail:{regionId:'630100'}});assert.equal(p.data.result,null);assert.equal(p.data.region.status,'REFERENCE');assert.equal(p.data.tiers.length,0);assert.notEqual(p.data.form.localAnnualConfirmed,'yes');assert.throws(()=>calculate(form({regionId:'630100',localAnnualConfirmed:'unknown'})),/确认/);});
test('新城市能打开本省政策页，来源不串两广和职工',()=>{const p=page('pages/policy/policy.js');p.onLoad({city:'350100',kind:'resident'});assert.equal(p.data.pending,'');assert.ok(p.data.documents.length>=3);assert.ok(p.data.documents.every(d=>d.kind==='resident'&&(d.id.startsWith('fj-')||d.id==='national-makeup-transition-2014')));p.onLoad({city:'350100',kind:'employee'});assert.ok(p.data.documents.length>=2);assert.equal(p.data.pending,'');assert.ok(p.data.documents.every(d=>d.kind==='employee'));});
test('浙江陕西城市复用省参考，杭州西安本地差异及成都独立公式不丢',()=>{assert.equal(national.capability('330200').base,240);assert.equal(national.capability('610300').base,198);assert.equal(national.capability('610100').base,239);assert.equal(national.capability('510100').rule,'CHENGDU_REFERENCE');assert.equal(national.capability('510300').rule,'SICHUAN_ORDINARY');assert.throws(()=>calculate(form({gxMakeupRows:[{mode:'missing',start:'2012',end:'2021',target:200}]})),/不能|广西|地区/);});

test('河北11市和辽宁14市按独立金额算例验证全部档，不把2026辽宁新档倒用于2025',()=>{
 for(const [id,count,base,tiers,grants]of [['130000',11,188,[200,300,500,1000,3000,5000,8000],[30,45,60,75,90,105,120]],['210000',14,179,[200,300,500,800,1000,2000,3000,4000,5000],[40,50,70,100,120,140,160,170,180]]]){
  const province=national.provinces.find(p=>p.id===id);assert.equal(province.cities.length,count);
  for(const c of province.cities)for(let i=0;i<tiers.length;i++){const r=calculate(form({regionId:c.id,tier:tiers[i]}));assert.equal(r.chosen.total,(tiers[i]*10).toFixed(2));assert.equal(r.chosen.subsidy,(grants[i]*10).toFixed(2));assert.equal(r.chosen.low,(base+(1800+tiers[i]*10+grants[i]*10)/139).toFixed(2));assert.equal(r.chosen.timeline.receivingAge,65);assert.equal(r.chosen.lumpYears,0);assert.equal(national.capability(c.id,'employee'),null);}
 }
 assert.throws(()=>calculate(form({regionId:'210100',asOf:'2025-10',tier:5000})),/2026/);
});
test('辽宁高龄加发按起领年龄，不将不连续历史当成连续长缴奖励',()=>{
 const base={regionId:'210100',years:'20',balance:'10000',pastAnnual:'',tier:200};
 assert.equal(calculate(form({...base,birth:'1966-10'})).chosen.base,'174.00');
 assert.equal(calculate(form({...base,birth:'1961-10'})).chosen.base,'179.00');
 const p=page();p.regionChoice({detail:{regionId:'210100'}});p.setData({'form.age':'55','form.years':'5','form.pastAnnual':'360','form.asOf':'2026-10'});p.calculate();assert.equal(p.data.error,'');p.regionChoice({detail:{regionId:'130100'}});assert.equal(p.data.result,null);p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.regionId,'130100');
});
test('监测能发现负补贴与重复档次，而非仅检查数组长度',()=>{
 const p=national.capability('130100'),savedTier=p.tiers[1],savedGrant=p.subsidies[0];
 try{p.tiers[1]=p.tiers[0];p.subsidies[0]=-1;const errors=audit().errors;assert.ok(errors.some(x=>x.includes('档次重复')));assert.ok(errors.some(x=>x.includes('补贴非法')));}finally{p.tiers[1]=savedTier;p.subsidies[0]=savedGrant;}
 assert.deepEqual(audit().errors,[]);
});

test('河南18项和重庆使用明确下限参考，不冒充省级完整基础额，不借用广西补缴',()=>{
 for(const [id,total,annual,credit]of [['410000',18,200,30],['500000',1,8000,200]]){const province=national.provinces.find(p=>p.id===id);assert.equal(province.cities.length,total);for(const c of province.cities){const p=c.resident,r=calculate(form({regionId:c.id,tier:annual}));assert.equal(p.parameterStatus,'NATIONAL_FLOOR_REFERENCE');assert.match(r.referenceLabel,/全国下限/);assert.match(r.referenceText,/不是/);assert.equal(r.chosen.low,(143+(1800+annual*10+credit*10)/139).toFixed(2));assert.equal(r.chosen.lumpYears,0);assert.throws(()=>calculate(form({regionId:c.id,tier:annual,gxTransitionEnabled:'yes',gxTransitionReviewed:'yes'})),/广西|本地区/);}}
 assert.equal(audit().provinceRows.filter(p=>['410000','500000'].includes(p.id)).reduce((n,p)=>n+p.limited,0),19);const template=fs.readFileSync(path.join(__dirname,'../miniprogram/resident/pages/calc/calc.wxml'),'utf8');assert.ok(template.includes("region.parameterStatus==='NATIONAL_FLOOR_REFERENCE'?'当地缴费档'"));
 assert.throws(()=>calculate(form({regionId:'500100',tier:600})),/当地缴费档次/);
});

test('缺少来源时审计报告错误而不是自身崩溃',()=>{const p=national.capability('500100'),saved=p.sources;try{delete p.sources;assert.ok(audit().errors.some(x=>x.includes('来源缺失')));assert.ok(audit().errors.some(x=>x.includes('下限参考缺明确标注')));}finally{p.sources=saved;}assert.deepEqual(audit().errors,[]);});
