const test=require('node:test'),assert=require('node:assert/strict');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const registry=require('../miniprogram/utils/city-policies');
const form=(patch={})=>({regionId:'445300',birth:'1971-10',asOf:'2026-10',years:'15',pastAnnual:'360',balance:'30000',tier:360,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',...patch});

test('云浮交够后可继续至60岁前，历史余额不动，补贴不作本人费用',()=>{
 const original=form(),stopped=calculate(original),continued=calculate({...original,payUntil:'SIXTY'}),s=continued.chosen;
 assert.equal(stopped.chosen.total,'0.00');assert.equal(stopped.chosen.base,'240.00');assert.equal(stopped.chosen.receiptYear,2031);
 assert.equal(continued.openingAmount,'30000.00');assert.equal(continued.pastPaid,null);assert.equal(continued.paidYears,15);
 assert.equal(s.timeline.normalYears,4);assert.equal(s.timeline.continuedYears,4);assert.equal(s.timeline.finalYears,19);assert.equal(s.timeline.firstYear,2027);assert.equal(s.timeline.lastYear,2030);
 assert.equal(s.total,'1440.00');assert.equal(s.subsidy,'320.00');assert.equal(s.account,'31760.00');assert.equal(s.base,'260.00');assert.equal(s.low,(260+31760/139).toFixed(2));assert.equal(s.lumpYears,0);assert.equal(s.lumpCost,'0.00');assert.equal(s.receiptYear,2031);
 assert.deepEqual(original,form());assert.ok(s.schedule.every(x=>x.cost==='360'&&x.subsidy==='80.00'));
});
test('云浮九档额外补贴从第16年计，不能给第15年提前加50',()=>{
 const tiers=registry.city('445300').resident.tiers;
 for(const [i,tier]of tiers.entries()){
  const credit=i<3?30:60,r=calculate(form({years:'14',tier,payUntil:'SIXTY'})),s=r.chosen;
  assert.equal(s.timeline.finalYears,18);assert.equal(s.total,(tier*4).toFixed(2));assert.equal(s.subsidy,(credit*4+150).toFixed(2));assert.equal(s.base,'255.00');assert.equal(s.account,(30000+tier*4+credit*4+150).toFixed(2));
  assert.equal(s.schedule[0].subsidy,credit.toFixed(2));assert.ok(s.schedule.slice(1).every(x=>x.subsidy===(credit+50).toFixed(2)));
  const minimum=calculate(form({years:'14',tier})).chosen;assert.equal(minimum.timeline.normalYears,1);assert.equal(minimum.subsidy,credit.toFixed(2));assert.equal(minimum.base,'240.00');
 }
});
test('云浮生日、今年缴费和原缴年数决定剩余年度，不在60岁之后继续加交',()=>{
 const sameYear=calculate(form({birth:'1967-10',paidThisYear:'no',payUntil:'SIXTY'})).chosen;
 assert.equal(sameYear.timeline.normalYears,1);assert.equal(sameYear.timeline.firstYear,2026);assert.equal(sameYear.timeline.lastYear,2026);assert.equal(sameYear.subsidy,'80.00');assert.equal(sameYear.base,'245.00');assert.equal(sameYear.receiptYear,2027);
 assert.throws(()=>calculate(form({birth:'1967-10',payUntil:'SIXTY'})),/60岁前/);
 assert.throws(()=>calculate(form({birth:'1966-10',payUntil:'SIXTY'})),/60岁前/);
 const lateBirthday=calculate(form({birth:'1971-11',payUntil:'SIXTY'})).chosen;assert.equal(lateBirthday.timeline.normalYears,5);assert.equal(lateBirthday.timeline.finalYears,20);assert.equal(lateBirthday.timeline.lastYear,2031);assert.equal(lateBirthday.base,'265.00');
 assert.throws(()=>calculate(form({years:'5',payUntil:'SIXTY'})),/仍有可缴年度/);
});
test('继续缴费不重算过去金额，不补历史补贴，不虚构历史提档',()=>{
 const r=calculate(form({years:'20',balance:'',pastAnnual:'200',payUntil:'SIXTY'}));
 assert.equal(r.openingAmount,'4000.00');assert.equal(r.pastPaid,'4000.00');assert.equal(r.makeup,null);assert.equal(r.chosen.subsidy,'320.00');assert.equal(r.chosen.account,'5760.00');assert.equal(r.chosen.base,'285.00');
 for(const s of r.scenarios){assert.equal(s.timeline.finalYears,24);assert.equal(s.lumpYears,0);assert.equal(s.immediateCost,null);assert.ok(s.total>0);}
});
test('未核实继续缴费的城市不能借云浮条款，默认35市计划不被强制扩长',()=>{
 for(const c of registry.cities.filter(c=>!['445300','440700'].includes(c.id)))assert.throws(()=>calculate(form({regionId:c.id,payUntil:'SIXTY'})),/本地区尚未接入/);
 for(const payUntil of ['forever',true,1,''])assert.throws(()=>calculate(form({payUntil})),/缴费时间/);
 const old=calculate(form()),explicit=calculate(form({payUntil:'MINIMUM'}));assert.deepEqual(old,explicit);
 const p=registry.city('445300').resident;assert.equal(p.postMinimumSubsidy,50);assert.ok(p.sources.some(s=>s.id==='yf-resident-rule-2026'));assert.match(p.referenceText,/第16年/);assert.doesNotMatch(p.referenceText,/未模拟/);
});

test('江门续缴独立九档矩阵，不套云浮额外补贴或改动已缴年度',()=>{
 const p=registry.city('440700').resident;
 assert.equal(p.postMinimumSubsidy,undefined);
 for(const [i,tier]of p.tiers.entries()){
  const f=form({regionId:'440700',tier}),r=calculate({...f,payUntil:'SIXTY'}),s=r.chosen,credit=i<3?30:60;
  assert.equal(s.timeline.normalYears,4);assert.equal(s.timeline.finalYears,19);assert.equal(s.total,(tier*4).toFixed(2));assert.equal(s.subsidy,(credit*4).toFixed(2));assert.equal(s.base,'254.50');assert.equal(s.account,(30000+(tier+credit)*4).toFixed(2));assert.equal(s.low,(254.5+(30000+(tier+credit)*4)/139).toFixed(2));assert.equal(s.receiptYear,2031);assert.equal(s.lumpYears,0);
  assert.equal(r.openingAmount,'30000.00');assert.equal(r.makeup,null);assert.ok(s.schedule.every(x=>x.year>=2027&&x.year<=2030&&x.subsidy===credit.toFixed(2)));
  const stopped=calculate(f).chosen;assert.equal(stopped.total,'0.00');assert.equal(stopped.account,'30000.00');assert.equal(stopped.base,'242.50');assert.equal(stopped.timeline.payUntil,'MINIMUM');
 }
 const s=calculate(form({regionId:'440700',birth:'1967-10',paidThisYear:'no',payUntil:'SIXTY'})).chosen;assert.equal(s.timeline.normalYears,1);assert.equal(s.base,'245.50');assert.equal(s.subsidy,'30.00');
 assert.throws(()=>calculate(form({regionId:'440700',birth:'1966-10',payUntil:'SIXTY'})),/60岁前/);
});
