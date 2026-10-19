const test=require('node:test'),assert=require('node:assert/strict');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const registry=require('../miniprogram/utils/city-policies');
const form=(patch={})=>({regionId:'450700',birth:'1960-10',asOf:'2026-10',years:'9',balance:'30000',pastAnnual:'200',tier:200,never:false,paidThisYear:'no',eligible:'yes',ordinary:'unknown',gxTransitionEnabled:'yes',gxTransitionStart:'2012-01',gxTransitionYears:'6',gxTransitionReviewed:'yes',...patch});

test('广西14市已核定补足的15档逐项算本人费用与补贴，既有账户不重算',()=>{
 for(const c of registry.cities.filter(c=>c.provinceId==='450000')){
  const r=calculate(form({regionId:c.id})),p=c.resident;assert.equal(r.transition.basis,'GX_2023_2_ARTICLE_2_3');assert.equal(r.scenarios.length,15);assert.equal(r.openingAmount,'30000.00');assert.equal(r.pastPaid,null);assert.ok(!p.lumpAt60);
  for(const [i,s]of r.scenarios.entries()){
   assert.equal(s.lumpYears,6);assert.equal(s.timeline.normalYears,0);assert.equal(s.timeline.finalYears,15);assert.equal(s.total,(p.tiers[i]*6).toFixed(2));assert.equal(s.subsidy,(p.subsidies[i]*6).toFixed(2));assert.equal(s.account,(30000+p.tiers[i]*6+p.subsidies[i]*6).toFixed(2));assert.equal(s.low,(p.base+5+(30000+p.tiers[i]*6+p.subsidies[i]*6)/139).toFixed(2));assert.equal(s.receiptYear,2026);assert.equal(s.timeline.lumpMonth,'2026-10');assert.match(s.schedule[0].type,/核定年数/);assert.equal(s.schedule[0].subsidy,s.subsidy);
  }
 }
});

test('只有年龄或年数不足不能进入过渡补足，未核定或年数冲突须拦截',()=>{
 for(const p of [{gxTransitionReviewed:'unknown'},{gxTransitionYears:''},{gxTransitionYears:'5'},{gxTransitionYears:'7'},{gxTransitionYears:'1.5'},{birth:'1966-11'},{never:true,years:'0',balance:'0',paidThisYear:'no'},{years:'15',gxTransitionYears:'0'},{gxTransitionStart:''},{gxTransitionStart:'2014-13'},{gxTransitionStart:'2020-01'},{gxTransitionStart:'2008-01'},{birth:'1970-01',gxTransitionStart:'2014-01'},{ageOnly:true},{years:'5',gxTransitionYears:'10'}])assert.throws(()=>calculate(form(p)));
 const ordinary=calculate(form({gxTransitionEnabled:'no',ordinary:'yes'}));assert.equal(ordinary.transition,null);assert.equal(ordinary.chosen.lumpYears,0);assert.equal(ordinary.chosen.timeline.normalYears,6);assert.equal(ordinary.chosen.receiptYear,2031);
 assert.throws(()=>calculate(form({gxTransitionEnabled:true,ordinary:'yes'})),/请选择是否/);
});

test('已核定过渡与历史断缴／提档不能混算，正常历史路径仍无补贴',()=>{
 const rows=[{mode:'missing',start:'2015',end:'2020',target:200}];
 assert.throws(()=>calculate(form({gxMakeupRows:rows,gxStartYear:'2012',gxScopeReviewed:'yes'})),/分开核定/);
 const normal=calculate(form({ordinary:'yes',gxTransitionEnabled:'no',gxMakeupRows:rows,gxStartYear:'2012',gxScopeReviewed:'yes'}));assert.equal(normal.chosen.subsidy,'0.00');assert.equal(normal.makeup.addedYears,6);assert.equal(normal.chosen.total,'1200.00');
});

test('核定补足按账户估算／查询金额分别处理，预算只扣本人费用，不扣补贴',()=>{
 const estimate=calculate(form({balance:'',pastAnnual:'200',tier:6000,budget:'35000'}));assert.equal(estimate.openingAmount,'1800.00');assert.equal(estimate.pastPaid,'1800.00');assert.equal(estimate.chosen.total,'36000.00');assert.equal(estimate.chosen.subsidy,'1200.00');assert.equal(estimate.chosen.account,'39000.00');assert.equal(estimate.chosen.low,(191+39000/139).toFixed(2));assert.equal(estimate.chosen.shortfall,'1000.00');assert.equal(estimate.chosen.affordable,false);assert.equal(estimate.chosen.recoveryFast,Math.ceil(36000/(191+39000/139)));
 const exact=calculate(form({balance:'5000',tier:6000,budget:'36000'}));assert.equal(exact.chosen.account,'42200.00');assert.equal(exact.chosen.affordable,true);assert.equal(exact.chosen.total,'36000.00');
});

test('过渡补足保留65岁与兴宁本地加额，次月跨年不补发过去待遇',()=>{
 const r=calculate(form({regionId:'450100',localArea:'xingning',gxTransitionStart:'2011-07',years:'10',gxTransitionYears:'5'}));assert.equal(r.chosen.base,'226.00');assert.equal(r.chosen.low,(226+31175/139).toFixed(2));
 const dec=calculate(form({birth:'1960-12',asOf:'2026-12'}));assert.equal(dec.chosen.receiptYear,2027);assert.equal(dec.chosen.timeline.lumpMonth,'2026-12');
});

test('广西核定补足不泄漏至广东或其他省份，不改变广西普通默认策略',()=>{
 for(const id of ['440100','440800','310100','110100'])assert.throws(()=>calculate(form({regionId:id,birth:'1966-10',years:'9',gxTransitionStart:'2014-01',gxTransitionYears:'6',ordinary:'yes',tier:id==='310100'?800:id==='110100'?1000:360})),/不能使用广西/);
 for(const c of registry.cities.filter(c=>c.provinceId==='450000')){const r=calculate(form({regionId:c.id,gxTransitionEnabled:'no',ordinary:'yes',years:'14'}));assert.equal(r.chosen.lumpYears,0);assert.equal(r.chosen.timeline.normalYears,1);}
});


test('原制度的45及60岁边界和南宁已核起点不能凭当前年龄或自行改日期绕过',()=>{
 assert.throws(()=>calculate(form({birth:'1967-01',asOf:'2029-01',gxTransitionStart:'2012-01',years:'13',gxTransitionYears:'2'})),/距60岁不足15年/);
 assert.throws(()=>require('../miniprogram/resident/utils/gx-transition').validate(form({birth:'1952-01',gxTransitionStart:'2012-01'}),{policy:registry.capability('450700','resident'),age:74,years:9,birth:1952*12,asOf:2026*12}),/未满60岁/);
 for(const area of ['xingning','qingxiu']){assert.throws(()=>calculate(form({regionId:'450100',localArea:area})),/区县已核日期不符/);const r=calculate(form({regionId:'450100',localArea:area,gxTransitionStart:'',years:'10',gxTransitionYears:'5'}));assert.equal(r.transition.schemeStart,'2011-07');assert.equal(r.transition.requiredYears,10);}
 assert.throws(()=>calculate(form({paidThisYear:'yes'})),/逐年记录/);
});

test('完整分段记录逐年核验到60岁当年，不能用后来的缴费年数掩盖早年断缴',()=>{
 const valid=calculate(form({historyMode:'segments',segments:[{start:'2012',end:'2020',annual:'200'}]}));assert.equal(valid.chosen.lumpYears,6);
 assert.throws(()=>calculate(form({historyMode:'segments',segments:[{start:'2012',end:'2018',annual:'200'},{start:'2021',end:'2022',annual:'200'}]})),/2019年缺少/);
});


test('核定补足预算计本人费用，2014并轨不得虚造当前60岁的补足资格',()=>{
 const r=calculate(form({birth:'1964-10',years:'13',gxTransitionStart:'2012-01',gxTransitionYears:'2',paidThisYear:'no',tier:200,budget:'300'})),s=r.chosen;
 assert.equal(r.transition.normalCurrentYear,false);assert.equal(s.timeline.normalYears,0);assert.equal(s.lumpYears,2);assert.equal(s.timeline.finalYears,15);assert.equal(s.total,'400.00');assert.equal(s.subsidy,'70.00');assert.equal(s.account,'30470.00');assert.equal(s.affordable,false);assert.equal(s.shortfall,'100.00');assert.equal(s.low,(186+30470/139).toFixed(2));
 const paid=calculate(form({birth:'1964-10',years:'14',gxTransitionStart:'2012-01',gxTransitionYears:'1',paidThisYear:'yes'}));assert.equal(paid.chosen.total,'200.00');assert.equal(paid.chosen.subsidy,'35.00');
 assert.throws(()=>calculate(form({birth:'1966-10',years:'12',gxTransitionStart:'2014-01',gxTransitionYears:'2'})),/2012年已实现/);
 assert.throws(()=>calculate(form({birth:'1966-10',years:'14',gxTransitionStart:'2012-01',gxTransitionYears:'1',paidThisYear:'no'})),/今年正常缴费后就满15年/);
 // The general transition validator still distinguishes a pending normal year
 // for valid older records; the amount calculator only accepts 2026 onward.
 const historical=require('../miniprogram/resident/utils/gx-transition').validate(form({birth:'1965-10',asOf:'2025-10',years:'13',gxTransitionYears:'1'}),{policy:registry.capability('450700','resident'),age:60,years:13,birth:1965*12+9,asOf:2025*12+9});assert.equal(historical.normalCurrentYear,true);assert.equal(historical.requiredYears,13);assert.equal(historical.years,1);
});
