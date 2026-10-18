const test=require('node:test'),assert=require('node:assert/strict');
const {calculate}=require('../miniprogram/resident/utils/calculate'),{tiersForYear,tiersForRange}=require('../miniprogram/resident/utils/gx-makeup');
const form=(patch={})=>({regionId:'450100',birth:'1971-10',asOf:'2026-10',years:'5',pastAnnual:'200',balance:'',tier:200,budget:'',never:false,paidThisYear:'no',eligible:'yes',ordinary:'yes',gxStartYear:'2012',gxScopeReviewed:'yes',...patch});
const upgrade=(patch={})=>({mode:'upgrade',start:'2019',end:'2023',original:'200',target:6000,subsidyAlready:'',...patch});
const missed=(patch={})=>({mode:'missing',start:'2015',end:'2017',target:2000,...patch});

test('广西原始附件年度上限与跨年度交集，不把6000元倒套到2018年',()=>{
 assert.equal(tiersForYear(2013).at(-1),1000);assert.equal(tiersForYear(2014).at(-1),2000);assert.equal(tiersForYear(2018).at(-1),2000);assert.equal(tiersForYear(2019).at(-1),6000);assert.equal(tiersForYear(2010).length,10);assert.equal(tiersForYear(2018).length,12);assert.equal(tiersForYear(2026).length,15);assert.deepEqual(tiersForYear(2009),[]);assert.deepEqual(tiersForRange('2018','2019'),[200,300,400,500,600,700,800,900,1000,1500,2000]);assert.deepEqual(tiersForRange('2019','9999'),[]);
});

test('历史提档只补原金额与新档差额，历史本金及未来年数不变',()=>{
 const r=calculate(form({gxMakeupRows:[upgrade()]})),s=r.chosen;
 assert.equal(r.openingAmount,'1000.00');assert.equal(r.pastPaid,'1000.00');assert.equal(r.paidYears,5);assert.equal(r.makeup.cost,'29000.00');assert.equal(r.makeup.upgradedYears,5);assert.equal(r.makeup.subsidy,'0.00');assert.equal(s.timeline.normalYears,10);assert.equal(s.immediateCost,'29000.00');assert.equal(s.total,'31000.00');assert.equal(s.subsidy,'350.00');assert.equal(s.account,'32350.00');assert.equal(s.low,(186+32350/139).toFixed(2));assert.ok(r.scenarios.every(x=>x.immediateCost==='29000.00'));assert.equal(r.makeup.entries[0].original,'200.00');assert.doesNotMatch(r.warnings.join(''),/不包含历史补缴、提档/);
});

test('查询余额已经含原缴费和利息，提档不重复加历史原额',()=>{
 const r=calculate(form({balance:'30000',gxMakeupRows:[upgrade()]}));assert.equal(r.openingAmount,'30000.00');assert.equal(r.pastPaid,null);assert.equal(r.chosen.account,'61350.00');assert.equal(r.chosen.total,'31000.00');
});

test('补断缴年份增加年数，可提前交够；不产生历史补贴',()=>{
 const r=calculate(form({gxMakeupRows:[missed()]})),s=r.chosen;
 assert.equal(r.makeup.addedYears,3);assert.equal(r.makeup.upgradedYears,0);assert.equal(r.remainingAfterMakeup,7);assert.equal(s.timeline.normalYears,7);assert.equal(s.receiptYear,2032);assert.equal(s.timeline.receivingAge,61);assert.equal(r.makeup.cost,'6000.00');assert.equal(s.total,'7400.00');assert.equal(s.subsidy,'245.00');assert.equal(s.account,'8645.00');assert.equal(s.low,(186+8645/139).toFixed(2));
});

test('60岁补明确的历史断缴后交够，不冒充有补贴的制度过渡补足',()=>{
 const r=calculate(form({birth:'1966-10',paidThisYear:'yes',gxMakeupRows:[missed({start:'2015',end:'2024'})]}));assert.equal(r.makeup.addedYears,10);assert.equal(r.chosen.immediateCost,'20000.00');assert.equal(r.chosen.timeline.normalYears,0);assert.equal(r.chosen.receiptYear,2026);assert.equal(r.chosen.timeline.receivingAge,60);assert.equal(r.chosen.subsidy,'0.00');assert.equal(r.chosen.account,'21000.00');assert.equal(r.chosen.low,(186+21000/139).toFixed(2));
});

test('今年提档只补差额补贴，未享受或已享受不能都按全额重发',()=>{
 for(const [already,grant]of [['60','140.00'],['0','200.00'],['200','0.00'],['250','0.00']]){const r=calculate(form({years:'1',paidThisYear:'yes',pastAnnual:'500',gxMakeupRows:[upgrade({start:'2026',end:'2026',original:'500',subsidyAlready:already})]}));assert.equal(r.makeup.cost,'5500.00');assert.equal(r.makeup.subsidy,grant);assert.equal(r.chosen.immediateCost,'5500.00');assert.equal(Number(r.chosen.subsidy),14*35+Number(grant));assert.equal(Number(r.chosen.account),500+5500+14*200+14*35+Number(grant));}
 assert.throws(()=>calculate(form({paidThisYear:'yes',gxMakeupRows:[upgrade({start:'2026',end:'2026',original:'200'})]})),/今年原档已享受的补贴/);
});

test('历史提档不依未来新档重新算，每年历史上限和原档必须有效',()=>{
 assert.throws(()=>calculate(form({gxMakeupRows:[upgrade({start:'2018',end:'2018'})]})),/2018年的原档或目标档/);
 assert.throws(()=>calculate(form({gxMakeupRows:[upgrade({start:'2012',end:'2013',target:2000})]})),/2012年的原档或目标档/);
 assert.throws(()=>calculate(form({gxMakeupRows:[upgrade({original:'360'})]})),/原档或目标档/);
 assert.throws(()=>calculate(form({gxMakeupRows:[upgrade({target:200})]})),/高于原/);
});

test('核对可补起点、年龄、重复年、未来年和原年数，不能任意买年限',()=>{
 assert.throws(()=>calculate(form({gxMakeupRows:[null]})),/核对补缴记录/);assert.throws(()=>calculate(form({gxMakeupRows:Array(21).fill(missed())})),/最多填写20/);
 for(const [patch,pattern]of [[{gxScopeReviewed:'unknown'},/尚未领取.*核对可补/],[{gxStartYear:''},/起始年度/],[{gxStartYear:'2020'},/可补起点/],[{birth:'2000-10'},/16岁/]])assert.throws(()=>calculate(form({...patch,gxMakeupRows:[missed()]})),pattern);
 assert.throws(()=>calculate(form({gxMakeupRows:[missed(),missed()]})),/同一年度不能重复/);
 assert.throws(()=>calculate(form({gxMakeupRows:[missed({start:'2027',end:'2027'})]})),/晚于当前年度/);
 assert.throws(()=>calculate(form({birth:'2000-10',gxMakeupRows:[missed({start:'2016',end:'2025',target:1000})]})),/可参保的实际年份/);
 assert.throws(()=>calculate(form({years:'1',gxMakeupRows:[upgrade()]})),/超过已经缴过/);
 assert.throws(()=>calculate(form({paidThisYear:'yes',gxMakeupRows:[upgrade()]})),/今年已含在年数中/);
 assert.throws(()=>calculate(form({gxMakeupRows:[missed({start:'2026',end:'2026'})]})),/今年未缴/);
 assert.throws(()=>calculate(form({paidThisYear:'no',gxMakeupRows:[upgrade({start:'2026',end:'2026',subsidyAlready:'35'})]})),/今年缴费必须已包含/);
});

test('分段原记录与提档逐年匹配，已交年份不能又补成断缴',()=>{
 const f=form({paidThisYear:'yes',historyMode:'segments',segments:[{start:'2022',end:'2026',annual:'200'}]});
 const r=calculate({...f,gxMakeupRows:[upgrade({start:'2022',end:'2025'})]});assert.equal(r.makeup.cost,'23200.00');
 assert.throws(()=>calculate({...f,gxMakeupRows:[missed({start:'2022',end:'2023'})]}),/已在历史缴费中/);
 assert.throws(()=>calculate({...f,gxMakeupRows:[upgrade({start:'2022',end:'2025',original:'300'})]}),/原金额与已填历史/);
 assert.throws(()=>calculate({...f,gxMakeupRows:[upgrade({start:'2019',end:'2020'})]}),/原金额与已填历史/);
 assert.throws(()=>calculate(form({pastAnnual:'360',gxMakeupRows:[upgrade()]})),/全部已缴年份的原金额/);
});

test('一次预算包括本次补缴费用，历史提档没有改变已经缴过的本金',()=>{
 const r=calculate(form({budget:'28999',gxMakeupRows:[upgrade()]}));assert.equal(r.chosen.affordable,false);assert.equal(r.chosen.shortfall,'1.00');assert.equal(r.openingAmount,'1000.00');assert.equal(r.chosen.recoveryFast,Math.ceil(31000/Number(r.chosen.low)));
});

test('三种补缴情形不混用：本页不自动生成过渡60岁补足或自费集体资助',()=>{
 const r=calculate(form({birth:'1966-10'}));assert.equal(r.makeup,null);assert.equal(r.chosen.timeline.normalYears,10);assert.equal(r.chosen.lumpYears,0);assert.equal(r.chosen.receiptYear,2035);
 for(const regionId of ['440100','441500','110100'])assert.throws(()=>calculate(form({regionId,tier:360,gxMakeupRows:[upgrade()]})),/本地区不能使用广西/);
 assert.throws(()=>calculate(form({selfCollectiveTier:6000,gxMakeupRows:[upgrade()]})),/自费集体档/);
});

for(const regionId of ['450100','450200','450300','450400','450500','450600','450700','450800','450900','451000','451100','451200','451300','451400'])test(regionId+'历史提档按自治区规则计算，未借用广州补贴',()=>{const r=calculate(form({regionId,gxMakeupRows:[upgrade()]}));assert.equal(r.makeup.cost,'29000.00');assert.equal(r.makeup.subsidy,'0.00');assert.equal(r.chosen.base,'186.00');assert.equal(r.chosen.subsidy,'350.00');assert.match(r.referenceText,/自治区|市县/);});


test('15个已缴年度按各年最高档提档，不允许把全部年份直接乘6000元',()=>{
 const rows=[upgrade({start:'2012',end:'2013',target:1000}),upgrade({start:'2014',end:'2018',target:2000}),upgrade({start:'2019',end:'2026',target:6000,subsidyAlready:'35'})];
 const r=calculate(form({years:'15',paidThisYear:'yes',gxMakeupRows:rows}));assert.equal(r.makeup.upgradedYears,15);assert.equal(r.makeup.cost,'57000.00');assert.equal(r.makeup.subsidy,'165.00');assert.equal(r.openingAmount,'3000.00');assert.equal(r.chosen.total,'57000.00');assert.equal(r.chosen.account,'60165.00');assert.equal(r.chosen.timeline.normalYears,0);assert.equal(r.chosen.low,(186+60165/139).toFixed(2));assert.equal(r.chosen.receiptYear,2031);assert.ok(r.makeup.entries.filter(x=>x.year<2019).every(x=>Number(x.target)<=2000));
});


test('广西补缴旧记录确认不能代替未领取资格，普通无补缴不强加确认',()=>{
 const f=form({gxMakeupRows:[upgrade()]});delete f.gxScopeReviewed;f.gxReviewed='yes';
 assert.throws(()=>calculate(f),/尚未领取基本养老保险待遇/);
 for(const value of ['unknown','no',true,1])assert.throws(()=>calculate({...f,gxScopeReviewed:value}),/尚未领取/);
 assert.equal(calculate({...f,gxScopeReviewed:'yes'}).makeup.cost,'29000.00');
 assert.equal(calculate({...f,gxMakeupRows:[]}).makeup,null);
});
