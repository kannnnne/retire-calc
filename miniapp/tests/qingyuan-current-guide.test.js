const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies'),local=require('../miniprogram/utils/local-resident-policies'),documents=require('../miniprogram/utils/city-documents');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const fees=[180,240,360,600,900,1200,1800,3600,4800],credits=[30,30,30,60,60,60,60,60,60];
const form=(patch={})=>({regionId:'441800',birth:'1971-10',asOf:'2026-10',years:'15',balance:'30000',pastAnnual:'360',tier:360,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',...patch});
test('清远2026市社保十页图解核本地最低额、年龄计发和继续年缴，资料只归清远居民',()=>{
 const p=registry.capability('441800','resident'),id='qy-resident-guide-2026',s=p.sources.find(s=>s.id===id),d=documents.find(s=>s.id===id);
 assert.equal(p.provincial,false);assert.equal(p.base,240);assert.equal(p.baseYear,2025);assert.equal(p.ageDivisor,true);assert.equal(p.continueTo60,true);assert.equal(p.postMinimumSubsidy,undefined);
 assert.ok(s);assert.equal(s.checkedAt,'2026-10-20');assert.match(s.publisher,/清远市社会保险基金管理局/);assert.deepEqual(d.cityIds,['441800']);assert.equal(d.kind,'resident');
 for(const c of registry.cities){assert.equal(c.employee.sources.some(x=>x.id===id),false);if(c.id!=='441800')assert.equal(c.resident.sources.some(x=>x.id===id),false);}
 for(const [age,extra]of [[64,0],[65,5],[79,5],[80,10]])assert.equal(local.ageExtra(p,age),extra);
});
test('清远官方第9图九档15年示例：输入图中账户，独立重现月领金额',()=>{
 const expected=['262.66','269.14','282.09','311.22','343.60','375.97','440.72','634.96','764.46'];
 for(const [i,tier]of fees.entries()){
  const account=15*(tier+credits[i]),r=calculate(form({birth:'1966-10',tier,balance:String(account)})),s=r.chosen;
  assert.equal(s.low,expected[i]);assert.equal(s.high,expected[i]);assert.equal(s.total,'0.00');assert.equal(s.base,'240.00');assert.equal(s.account,account.toFixed(2));assert.equal(s.timeline.receivingAge,60);assert.equal(r.ageDivisor,true);
 }
});
test('清远官方第10图九档30年示例：未来继续交至60岁，长缴15年共月加45',()=>{
 const expected=['330.32','343.27','369.17','427.45','492.19','556.94','686.44','1074.93','1333.92'];
 for(const [i,tier]of fees.entries()){
  const r=calculate(form({birth:'1996-03',asOf:'2026-03',years:'0',never:true,paidThisYear:'no',balance:'0',tier,payUntil:'SIXTY'})),s=r.chosen;
  assert.equal(s.timeline.normalYears,30);assert.equal(s.timeline.finalYears,30);assert.equal(s.total,(tier*30).toFixed(2));assert.equal(s.subsidy,(credits[i]*30).toFixed(2));assert.equal(s.account,((tier+credits[i])*30).toFixed(2));assert.equal(s.base,'285.00');assert.equal(s.low,expected[i]);assert.equal(s.lumpYears,0);assert.equal(s.receiptYear,2056);
 }
});
test('清远首次65岁领取账户按101月，不能继续把139用于所有年龄',()=>{
 for(const [birth,age,divisor,base]of [['1966-10',60,139,240],['1962-10',64,109,240],['1961-10',65,101,245],['1956-10',70,56,245]]){
  const s=calculate(form({birth})).chosen;assert.equal(s.timeline.receivingAge,age);assert.equal(s.base,base.toFixed(2));assert.equal(s.personalLow,(30000/divisor).toFixed(2));assert.equal(s.low,(base+30000/divisor).toFixed(2));
 }
 assert.throws(()=>calculate(form({birth:'1955-11'})),/首次领取年龄超过70/);
});
test('清远交满后继续四年，各档不添加云浮50元额外补贴且已缴余额不变',()=>{
 for(const [i,tier]of fees.entries()){
  const stopped=calculate(form({tier})).chosen,r=calculate(form({tier,payUntil:'SIXTY'})),s=r.chosen;
  assert.equal(stopped.total,'0.00');assert.equal(r.openingAmount,'30000.00');assert.equal(s.timeline.normalYears,4);assert.equal(s.timeline.finalYears,19);assert.equal(s.total,(tier*4).toFixed(2));assert.equal(s.subsidy,(credits[i]*4).toFixed(2));assert.equal(s.base,'252.00');assert.equal(s.low,(252+(30000+(tier+credits[i])*4)/139).toFixed(2));assert.equal(s.receiptYear,2031);
 }
 assert.throws(()=>calculate(form({birth:'1966-10',payUntil:'SIXTY'})),/60岁前/);
});
test('清远图解不解除2026当年档限制，不自动批准老制度补足',()=>{
 assert.throws(()=>calculate(form({years:'14',paidThisYear:'no',tier:4800})),/今年实际/);
 const r=calculate(form({years:'14',paidThisYear:'no',currentYearTier:360,tier:4800}));assert.equal(r.chosen.total,'360.00');assert.equal(r.chosen.subsidy,'30.00');assert.equal(r.chosen.account,'30390.00');
 const s=calculate(form({birth:'1966-10',years:'5'})).chosen;assert.equal(s.timeline.lumpAge,65);assert.equal(s.lumpYears,6);assert.equal(s.subsidy,'120.00');assert.equal(s.low,(245+33720/101).toFixed(2));
 assert.throws(()=>calculate(form({birth:'1961-10',years:'5'})),/确认已按规定延缴/);
});
