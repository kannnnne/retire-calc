const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {calculate}=require('../miniprogram/resident/utils/calculate'),registry=require('../miniprogram/utils/city-policies');
const form=(patch={})=>({regionId:'450800',birth:'1971-10',asOf:'2026-10',years:'5',balance:'10000',pastAnnual:'200',tier:6000,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',socialAidAnnual:6000,socialAidConfirmed:'yes',...patch});

test('广西14市15档社会资助只加未来正常年度账户与家庭费，不买年数或补贴',()=>{
 const cities=registry.cities.filter(c=>c.provinceId==='450000');assert.equal(cities.length,14);
 for(const c of cities){const p=c.resident;assert.equal(p.socialAidCap,6000);const plain=calculate(form({regionId:c.id,socialAidAnnual:0})),aid=calculate(form({regionId:c.id}));assert.equal(aid.scenarios.length,15);assert.equal(aid.openingAmount,'10000.00');assert.equal(aid.transition,null);
  for(let i=0;i<15;i++){const s=aid.scenarios[i],old=plain.scenarios[i],fee=p.tiers[i];assert.equal(s.timeline.normalYears,10);assert.equal(s.lumpYears,0);assert.equal(s.timeline.finalYears,15);assert.equal(s.socialAidCost,'60000.00');assert.equal(s.total,((fee+6000)*10).toFixed(2));assert.equal(s.subsidy,(p.subsidies[i]*10).toFixed(2));assert.equal(s.account,(10000+(fee+p.subsidies[i]+6000)*10).toFixed(2));assert.ok(Math.abs(+s.low- +old.low-60000/139)<.011);assert.equal(s.base,old.base);assert.equal(s.receiptYear,old.receiptYear);assert.equal(s.recoveryFast,Math.ceil(+s.total/+s.low));assert.ok(s.schedule.every(x=>x.socialAid==='6000.00'&&x.personalCost===String(fee)));}
  const s=aid.chosen;assert.equal(s.total,'120000.00');assert.equal(s.account,'132000.00');assert.equal(s.subsidy,'2000.00');assert.equal(s.low,(191+132000/139).toFixed(2));assert.throws(()=>calculate(form({regionId:c.id,socialAidAnnual:6000.01})),/6000/);assert.throws(()=>calculate(form({regionId:c.id,socialAidConfirmed:'unknown'})),/没有其他集体补助/);
 }
});

test('贵港原文历史断缴和提档独立复算：2013不超1000、历史不补贴、本年补差',()=>{
 const p={socialAidAnnual:0,regionId:'450800',birth:'1965-09',years:'13',balance:'20000',gxStartYear:'2012',gxScopeReviewed:'yes',gxMakeupRows:[{mode:'missing',start:'2013',end:'2013',target:1000},{mode:'missing',start:'2019',end:'2019',target:6000}]};
 const r=calculate(form(p));assert.equal(r.makeup.cost,'7000.00');assert.equal(r.makeup.subsidy,'0.00');assert.equal(r.makeup.addedYears,2);assert.equal(r.chosen.timeline.normalYears,0);assert.equal(r.chosen.account,'27000.00');assert.equal(r.chosen.total,'7000.00');assert.equal(r.chosen.low,(186+27000/139).toFixed(2));assert.throws(()=>calculate(form({...p,gxMakeupRows:[{...p.gxMakeupRows[0],target:6000}]})),/2013年的原档或目标档/);
 const upgrade=calculate(form({socialAidAnnual:0,years:'11',balance:'40000',birth:'1985-02',gxStartYear:'2016',gxScopeReviewed:'yes',gxMakeupRows:[{mode:'upgrade',start:'2016',end:'2018',original:100,target:2000},{mode:'upgrade',start:'2019',end:'2023',original:200,target:6000},{mode:'upgrade',start:'2026',end:'2026',original:1500,target:3000,subsidyAlready:175}]}));
 assert.equal(upgrade.makeup.cost,'36200.00');assert.equal(upgrade.makeup.subsidy,'25.00');assert.equal(upgrade.makeup.addedYears,0);assert.equal(upgrade.makeup.upgradedYears,9);assert.equal(upgrade.chosen.account,(40000+36200+25+(6000+200)*4).toFixed(2));
});

test('资助不回填补缴或核定补足，不改变广西县区本地加发',()=>{
 const f=form({birth:'1960-10',years:'9',balance:'30000',paidThisYear:'no',ordinary:'unknown',gxTransitionEnabled:'yes',gxTransitionStart:'2012-01',gxTransitionYears:'6',gxTransitionReviewed:'yes'});
 assert.throws(()=>calculate(f),/没有可安排资助/);const s=calculate({...f,socialAidAnnual:0}).chosen;assert.equal(s.lumpYears,6);assert.equal(s.total,'36000.00');assert.equal(s.subsidy,'1200.00');
 const withHistory=form({gxStartYear:'2012',gxScopeReviewed:'yes',gxMakeupRows:[{mode:'missing',start:'2012',end:'2013',target:1000}]}),r=calculate(withHistory);assert.equal(r.makeup.cost,'2000.00');assert.equal(r.chosen.socialAidYears,8);assert.equal(r.chosen.socialAidCost,'48000.00');assert.equal(r.chosen.account,(10000+2000+12200*8).toFixed(2));
 for(const [localArea,base]of [['xingning',226],['qingxiu',191]]){const r=calculate(form({regionId:'450100',localArea}));assert.equal(+r.chosen.base,base);assert.equal(r.chosen.socialAidCost,'60000.00');}
});

test('广西资助原文只归广西居民，不把贵港2024示例旧基础／年数作为全区当前标准',()=>{
 for(const c of registry.cities){assert.equal(c.resident.sources.some(s=>s.id==='gx-resident-social-aid-rule'),c.provinceId==='450000');assert.equal(c.employee.sources.some(s=>s.id==='gx-resident-social-aid-rule'),false);assert.equal(c.resident.sources.some(s=>s.id==='gg-resident-transition-aid-2024'),c.id==='450800');}
 const p=registry.city('450800').resident;assert.equal(p.base,186);assert.equal(p.provincial,true);assert.equal(p.gxSchemeStart,undefined);assert.equal(p.lumpAt60,undefined);const doc=p.sources.find(s=>s.id==='gg-resident-transition-aid-2024');assert.match(doc.text,/港北2010/);assert.match(doc.text,/未给具体月份/);assert.match(doc.text,/多10元/);
 // The 2024 page's two displayed amounts use 136, despite its note saying 146.
 assert.equal((136+62150/139).toFixed(2),'583.12');assert.equal((136+122150/139).toFixed(2),'1014.78');assert.equal((146+62150/139).toFixed(2),'593.12');assert.equal((146+122150/139).toFixed(2),'1024.78');
});

function page(store={}){let config;const base=path.join(__dirname,'../miniprogram/resident/pages/calc');vm.runInNewContext(fs.readFileSync(path.join(base,'calc.js'),'utf8'),{require:x=>require(path.resolve(base,x)),Page:x=>config=x,wx:{getStorageSync:()=>'',setStorageSync(){},pageScrollTo(){},showModal(){}},Date,JSON,console});const p={...config,data:JSON.parse(JSON.stringify(store.saved||config.data)),setData(patch){for(const [key,value]of Object.entries(patch)){const keys=key.split('.');let target=this.data;for(const k of keys.slice(0,-1))target=target[k];target[keys.at(-1)]=value;}}};return p;}
test('真实页面事件可选广西6000资助、切换年档、取消，跨省不沿用金额与确认',()=>{
 const p=page();p.regionChoice({detail:{regionId:'450800'}});p.setData({form:{...p.data.form,...form(),socialAidAnnual:0,socialAidConfirmed:'unknown',ageOnly:false,accountMode:'balance'}});p.refreshPolicyQuestions();p.calculate();assert.equal(p.data.error,'');const baseline=p.data.result.chosen.account;assert.equal(p.data.region.socialAidCap,6000);p.socialAidConfirm({detail:{value:['yes']}});p.socialAidChoose({detail:{value:p.data.socialAidOptions.indexOf(6000)}});assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.account,'132000.00');assert.equal(p.data.baseline.account,baseline);p.chooseFuture({currentTarget:{dataset:{annual:200}}});assert.equal(p.data.result.chosen.socialAidAnnual,6000);assert.equal(p.data.result.chosen.annualTotal,6200);p.socialAidConfirm({detail:{value:[]}});assert.equal(p.data.result.chosen.socialAidCost,'0.00');p.regionChoice({detail:{regionId:'440400'}});assert.equal(p.data.form.socialAidAnnual,0);assert.equal(p.data.form.socialAidConfirmed,'unknown');assert.equal(p.data.region.socialAidCap,1800);assert.equal(p.data.result,null);
});
