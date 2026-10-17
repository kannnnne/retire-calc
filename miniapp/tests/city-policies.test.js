const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const registry=require('../miniprogram/utils/city-policies'),{forecast}=require('../miniprogram/utils/forecast'),{contributionRange}=require('../miniprogram/utils/input-model'),resident=require('../miniprogram/resident/utils/calculate').calculate;
const employee=(patch={})=>({regionId:'110100',category:'MALE',birthMonth:'1985-06',firstInsuredMonth:'2006-07',dataAsOf:'2026-10',paidMonths:180,principal:'80000',currentBase:'7270',historicalIndex:'0.3',contributionType:'EMPLOYEE',plan:'CURRENT',...patch});
const form=(patch={})=>({regionId:'310100',birth:'1971-10',asOf:'2026-10',years:'5',pastAnnual:'360',balance:'',tier:800,budget:'',never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',...patch});
function page(relative,store={}){const file=path.join(__dirname,'../miniprogram',relative);let definition;vm.runInNewContext(fs.readFileSync(file,'utf8'),{Page:p=>definition=p,Date,wx:{pageScrollTo(){},showModal(){},navigateTo(){}},require:name=>name.endsWith('/session')?{load:k=>store[k]||null,save:(k,v)=>store[k]=JSON.parse(JSON.stringify(v))}:require(path.resolve(path.dirname(file),name))});const p={...definition,data:JSON.parse(JSON.stringify(definition.data)),setData(values){for(const [key,value]of Object.entries(values)){let d=this.data;const ks=key.split('.');for(const k of ks.slice(0,-1))d=d[k];d[ks.at(-1)]=value;}}};p.onLoad();return p;}
test('四十个城市按行政码登记、三入口共用能力清单，核对未完成不能借用广州',()=>{assert.equal(registry.cities.length,40);assert.equal(new Set(registry.cities.map(c=>c.id)).size,40);for(const c of registry.cities){assert.equal(registry.capability(c.id,'flexible'),c.employee);assert.ok(c.provinceId);for(const kind of ['employee','resident']){assert.ok(['READY','PENDING'].includes(c[kind].status));if(c[kind].status==='PENDING')assert.ok(c[kind].reason);}}for(const c of registry.cities){assert.equal(c.employee.status,'READY');assert.equal(c.resident.status,'READY');}assert.throws(()=>forecast(employee({regionId:'999999'})),/地区/);});
test('北京月缴下限按2026年7月起切换，旧月份不能倒套新参数',()=>{assert.deepEqual(contributionRange('2026-10','110100'),{min:7270,max:36348,effectiveFrom:'2026-07',regionId:'110100'});assert.throws(()=>contributionRange('2026-06','110100'),/2026-07/);assert.throws(()=>forecast(employee({dataAsOf:'2026-06'})),/2026-07/);});
test('外省普通基础养老金不套广州低指数修正，未来指数用当地工资分母',()=>{const r=forecast(employee()),s=r.scenarios[0];assert.equal(r.parameter.pensionBase,12049);const index=(.3*180+7270/12116*s.futureMonths)/s.totalMonths;assert.ok(Math.abs(Number(s.index)-index)<.0001);assert.ok(Math.abs(Number(s.basic)-12049*(1+index)/2*s.totalMonths/12*.01)<.01);assert.equal(r.region,'北京市');assert.ok(r.sources.some(s=>s.id==='bj-rule'));});
test('同地区单位8%、灵活20%、个人账户8%，不把统筹并入账户',()=>{const a=forecast(employee()),b=forecast(employee({contributionType:'FLEXIBLE'}));assert.equal(a.scenarios[0].monthlyPersonalPayment,'581.60');assert.equal(b.scenarios[0].monthlyPersonalPayment,'1454.00');assert.equal(a.scenarios[0].futureAccountCredit,b.scenarios[0].futureAccountCredit);});
test('上海使用2026办法与12577参考工资，范围不能沿用北京或广州',()=>{const r=forecast(employee({regionId:'310100',currentBase:'7546'}));assert.equal(r.parameter.pensionBase,12577);assert.equal(r.scenarios[0].monthlyPersonalPayment,'603.68');assert.throws(()=>forecast(employee({regionId:'310100'})),/基数/);assert.throws(()=>forecast(employee({regionId:'310100',currentBase:'7546',dataAsOf:'2026-07'})),/2026-08/);});
test('居民上海七档补贴逐年入账，交不足不能自动在65岁补足',()=>{const r=resident(form()),s=r.chosen;assert.equal(r.openingAmount,'1800.00');assert.equal(s.total,'8000.00');assert.equal(s.subsidy,'2700.00');assert.equal(s.account,'12500.00');assert.equal(s.low,(1555+12500/139).toFixed(2));assert.equal(s.low,s.high);assert.equal(s.lumpYears,0);assert.equal(s.timeline.normalYears,10);assert.equal(s.receiptYear,2036);const x=resident(form({ageOnly:true,birth:'1966-10',years:'5'}));assert.equal(x.chosen.receiptYear,2036);assert.equal(x.chosen.lumpYears,0);assert.equal(x.chosen.timeline.receivingAge,70);});
test('居民北京允许区间自选金额，不能把常用五金额当成法定五档',()=>{for(const [annual,credit]of [[1000,60],[1999,60],[2000,90],[3999,90],[4000,120],[5999,120],[6000,150],[9000,150]]){const r=resident(form({regionId:'110100',tier:annual}));assert.equal(Number(r.chosen.subsidy),credit*10);assert.equal(Number(r.chosen.total),annual*10);assert.ok(r.scenarios.some(s=>s.annual===annual));assert.equal(r.chosen.low,(998+(1800+annual*10+credit*10)/101).toFixed(2));}for(const tier of [999,9001,'abc',1000.001])assert.throws(()=>resident(form({regionId:'110100',tier})),/1000至9000/);});
test('新城市历史未确认、原制度北京参保、自费集体、重复历史均拦截',()=>{assert.throws(()=>resident(form({ordinary:'unknown'})),/普通/);assert.throws(()=>resident(form({regionId:'110100',tier:1000,years:'13'})),/2015/);assert.throws(()=>resident(form({selfCollectiveTier:360})),/广州/);assert.throws(()=>resident(form({never:true,years:0,paidThisYear:'yes'})),/不一致/);assert.throws(()=>resident(form({historyMode:'segments',segments:[{start:'2020',end:'2022',annual:'360'},{start:'2022',end:'2023',annual:'360'}]})),/重叠/);});
test('上海已超15年加发每年20元，已知余额不重复加历史金额',()=>{const r=resident(form({birth:'1966-10',years:'18',balance:'30000',pastAnnual:'99999'}));assert.equal(r.openingAmount,'30000.00');assert.equal(r.chosen.base,'1615.00');assert.equal(r.chosen.total,'0.00');assert.equal(r.chosen.low,(1615+30000/139).toFixed(2));});
test('北京上海居民补贴不沿用广州21600封顶，新增地区使用本省规则',()=>{const s=resident(form({tier:7300,usedSubsidy:'21600'})).chosen;assert.equal(s.subsidy,'7300.00');for(const id of ['510100','330100','610100']){const r=resident(form({regionId:id,cdResidence:'rural',tier:registry.city(id).resident.tiers[0]}));assert.equal(r.regionId,id);assert.match(r.referenceLabel,/参考/);}});
test('职工真实页面事件切换地区清结果，自动月缴和账户改用当地下限',()=>{const p=page('pages/index/index.js');p.calculate();assert.ok(p.data.result);p.regionChanged({detail:{regionId:'110100'}});assert.equal(p.data.result,null);assert.equal(p.data.basePayment,'581.60');p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.regionId,'110100');p.regionChanged({detail:{regionId:'510100'}});assert.equal(p.data.result,null);assert.equal(p.data.regionReady,true);p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.regionId,'510100');});
test('灵活真实页面事件切换地区使用不同费用，未开放不残留旧结果',()=>{const p=page('flexible/pages/calc/calc.js');p.regionChanged({detail:{regionId:'310100'}});assert.equal(p.data.futurePayment,'1509.20');p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.regionId,'310100');p.regionChanged({detail:{regionId:'510100'}});assert.equal(p.data.regionReady,true);assert.equal(p.data.result,null);p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.regionId,'510100');});
test('居民切换清除广州补贴及自费集体设置，普通资格必须重新确认',()=>{const p=page('resident/pages/calc/calc.js');p.setData({'form.usedSubsidy':'21600','form.noCollective':'yes','form.selfCollectiveTier':360,'form.ordinary':'yes'});p.regionChoice({detail:{regionId:'310100'}});assert.equal(p.data.form.usedSubsidy,'');assert.equal(p.data.form.selfCollectiveTier,0);assert.equal(p.data.form.ordinary,'unknown');assert.equal(p.data.form.eligible,'unknown');assert.equal(p.data.form.tier,800);p.setData({'form.ordinary':'yes','form.eligible':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.region,'上海市');assert.equal(p.data.result.chosen.lumpYears,0);});
test('城市政策页只列该城市来源，未知城市或无已核对文档不能回退广州',()=>{const p=page('pages/policy/policy.js');p.onLoad({city:'310100',kind:'resident'});assert.ok(p.data.documents.length>=3);assert.ok(p.data.documents.every(d=>d.cityId==='310100'));p.onLoad({city:'510100',kind:'employee'});assert.ok(p.data.documents.length>=3);assert.ok(p.data.documents.every(d=>d.cityIds.includes('510100')));p.onLoad({city:'999999'});assert.equal(p.data.documents.length,0);});
test('切换到新城市时旧截至月仍可修改，计算明确阻断日期倒套',()=>{for(const relative of ['pages/index/index.js','flexible/pages/calc/calc.js']){const p=page(relative);p.setData({'form.dataAsOf':'2026-06'});p.regionChanged({detail:{regionId:'310100'}});assert.equal(p.data.regionReady,true);assert.match(p.data.error,/截至月份/);p.calculate();assert.equal(p.data.result,null);assert.match(p.data.error,/2026-08/);}});
test('北京延期领取按计划完成时的周岁，不能仅用年份相减误多算一岁',()=>{const r=resident(form({regionId:'110100',birth:'1971-12',tier:1000}));assert.equal(r.chosen.timeline.receivingAge,64);assert.equal(r.chosen.low,(998+(1800+10000+600)/109).toFixed(2));});
test('共享省市组件按行政码定位，不把居民省份数组下标当城市标识',()=>{let definition;const file=path.join(__dirname,'../miniprogram/components/region-picker/index.js');vm.runInNewContext(fs.readFileSync(file,'utf8'),{Component:d=>definition=d,wx:{navigateTo(){}},require:n=>require(path.resolve(path.dirname(file),n))});let selected;const component={...definition.methods,data:{...definition.data,value:'310100',kind:'resident'},setData(v){Object.assign(this.data,v);},triggerEvent(name,value){selected=value;}};component.sync();assert.equal(component.data.name,'上海市');assert.equal(component.data.pending,false);component.province({detail:{value:0}});assert.equal(selected.regionId,'440100');component.data.value='510100';component.sync();assert.equal(component.data.pending,false);assert.match(component.data.referenceLabel,/成都/);});

const provinces=require('../miniprogram/utils/province-policies');

test('省级参考按本省匹配，成都居民用独立市级公式覆盖四川职工参考',()=>{
 for(const id of ['330100','610100','510100']){const c=registry.city(id);assert.equal(c.employee.scope,'PROVINCE_REFERENCE');assert.equal(c.employee.policyProvinceId,c.provinceId);assert.equal(c.resident.policyProvinceId,c.provinceId);}
 assert.equal(registry.city('510100').resident.scope,'CITY_REFERENCE');
 assert.equal(registry.city('510100').resident.rule,'CHENGDU_REFERENCE');
 assert.equal(registry.city('330100').resident.scope,'PROVINCE_REFERENCE');
 assert.equal(registry.city('999999'),null);
});
test('浙江2026范围和待遇都使用新文件，四川历史参数与陕西披露参数不冒充官方当年标准',()=>{
 const hz=forecast(employee({regionId:'330100',currentBase:'5122'}));assert.equal(hz.parameter.pensionBase,8537);assert.equal(hz.parameter.year,2026);assert.equal(hz.scenarios[0].monthlyPersonalPayment,'409.76');assert.match(hz.referenceNote,/两项/);
 const sc=forecast(employee({regionId:'510100',currentBase:'4699'}));assert.equal(sc.parameter.status,'REFERENCE');assert.equal(sc.parameter.year,2024);assert.equal(sc.parameter.pensionBase,8321);assert.equal(sc.scenarios[0].monthlyPersonalPayment,'375.92');
 const sn=forecast(employee({regionId:'610100',currentBase:'4737'}));assert.equal(sn.parameter.status,'REFERENCE');assert.equal(sn.parameter.pensionBase,7881);assert.equal(sn.scenarios[0].monthlyPersonalPayment,'378.96');assert.match(sn.referenceNote,/原件待补/);
 for(const id of ['330100','610100','510100'])assert.throws(()=>forecast(employee({regionId:id,dataAsOf:'2025-12'})),/2026-01/);
});
test('浙江居民排除困难代缴档，省级补贴不偷用杭州市区高档补贴',()=>{
 const r=resident(form({regionId:'330100',tier:7000}));assert.equal(r.chosen.base,'240.00');assert.equal(r.chosen.subsidy,'6000.00');assert.equal(r.chosen.low,(240+(1800+70000+6000)/139).toFixed(2));assert.equal(r.chosen.lumpYears,0);assert.equal(r.chosen.receiptYear,2036);
 assert.throws(()=>resident(form({regionId:'330100',tier:200})),/档次/);assert.ok(r.sources.some(s=>s.id==='zj-resident-subsidy-2026'));
});
test('陕西居民十档补贴、省级最低与广州分别计算',()=>{
 const r=resident(form({regionId:'610100',tier:500}));assert.equal(r.chosen.base,'198.00');assert.equal(r.chosen.subsidy,'750.00');assert.equal(r.chosen.account,'7550.00');assert.equal(r.chosen.low,(198+7550/139).toFixed(2));assert.equal(r.chosen.lumpYears,0);assert.throws(()=>resident(form({regionId:'610100',tier:200})),/档次/);
});
test('成都首次60岁趸缴五档金额逐项匹配2026年社保原图，不套全额入账或省通用公式',()=>{
 const tiers=registry.city('510100').resident.tiers,totals=['20489.40','40978.80','61470.00','81959.40','102448.80'];
 for(let i=0;i<tiers.length;i++){
  const r=resident(form({regionId:'510100',birth:'1966-10',never:true,years:'0',pastAnnual:'',paidThisYear:'no',cdResidence:'rural',tier:tiers[i]})),s=r.chosen;
  assert.equal(s.total,totals[i]);assert.equal(s.lumpCost,totals[i]);assert.equal(s.lumpYears,15);assert.equal(s.timeline.normalYears,0);assert.equal(s.subsidy,'0.00');assert.equal(s.timeline.lumpAge,60);assert.equal(s.receiptYear,2026);
  assert.ok(Math.abs(Number(s.account)-Number(s.total)*2/3)<.01);assert.ok(Math.abs(Number(s.base)-(223+Number(s.total)/.12/12*.01))<.01);
 }
 const low=resident(form({regionId:'510100',birth:'1966-10',never:true,years:'0',pastAnnual:'',paidThisYear:'no',cdResidence:'rural',tier:1138.32}));assert.equal(low.chosen.low,'463.56');assert.equal(low.subsidyKnown,false);
});
test('成都城镇仅两档，身份未选与低档城镇均不能生成金额',()=>{
 assert.throws(()=>resident(form({regionId:'510100',tier:1138.32})),/农村.*城镇/);
 assert.throws(()=>resident(form({regionId:'510100',cdResidence:'urban',tier:1138.32})),/40%或50%/);
 const r=resident(form({regionId:'510100',cdResidence:'urban',tier:4553.28}));assert.deepEqual(r.scenarios.map(s=>s.annual),[4553.28,5691.6]);
});
test('成都55岁已交5年：历史不动，今后4年年缴与60岁补6年按不同单价',()=>{
 const r=resident(form({regionId:'510100',cdResidence:'rural',pastAnnual:'1138.32',tier:1138.32})),s=r.chosen;
 assert.equal(r.pastPaid,'5691.60');assert.equal(r.openingAmount,'4553.28');assert.equal(s.timeline.normalYears,4);assert.equal(s.timeline.firstYear,2027);assert.equal(s.timeline.lastYear,2030);assert.equal(s.lumpYears,6);assert.equal(s.lumpCost,'8195.76');assert.equal(s.total,'12749.04');assert.equal(s.receiptYear,2031);assert.equal(s.timeline.lumpMonth,'2031-10');assert.equal(s.low,'463.56');
 const high=r.scenarios.at(-1);assert.equal(high.lumpCost,'40979.52');assert.equal(high.low,'1105.06');assert.equal(r.openingAmount,'4553.28');
});
test('成都已知账户不能替代历史年缴；分段历史按2012年起核验',()=>{
 assert.throws(()=>resident(form({regionId:'510100',cdResidence:'rural',pastAnnual:'',balance:'30000',tier:1138.32})),/历史年缴/);
 const r=resident(form({regionId:'510100',cdResidence:'rural',pastAnnual:'1138.32',balance:'30000',tier:1138.32}));assert.equal(r.openingAmount,'30000.00');
 assert.throws(()=>resident(form({regionId:'510100',cdResidence:'rural',years:'16',tier:1138.32})),/2012/);
 const segments=[{start:'2022',end:'2026',annual:'1138.32'}],s=resident(form({regionId:'510100',cdResidence:'rural',historyMode:'segments',segments,tier:1138.32}));assert.equal(s.pastPaid,'5691.60');assert.equal(s.openingAmount,'4553.28');
});
test('成都预算包含趸缴12%金额；12月补足与次年起领分别显示',()=>{
 const r=resident(form({regionId:'510100',birth:'1966-12',asOf:'2026-12',cdResidence:'rural',never:true,years:'0',pastAnnual:'',paidThisYear:'no',tier:1138.32,budget:'20000'})),s=r.chosen;
 assert.equal(s.shortfall,'489.40');assert.equal(s.affordable,false);assert.equal(s.timeline.lumpMonth,'2026-12');assert.equal(s.receiptYear,2027);
 const template=fs.readFileSync(path.join(__dirname,'../miniprogram/resident/pages/calc/calc.wxml'),'utf8');assert.match(template,/pension-start[^\n]*receiptYear/);assert.match(template,/payment-date[^\n]*lumpMonth/);
});
test('成都页面身份切换、已知余额、换档与再次进入保留正确金额',()=>{
 const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:'510100'}});p.setData({'form.ordinary':'yes','form.eligible':'yes'});p.calculate();assert.match(p.data.error,/农村.*城镇/);
 p.cdResidence({currentTarget:{dataset:{value:'urban'}}});assert.equal(p.data.tiers.length,2);assert.equal(p.data.form.tier,4553.28);p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.scenarios.length,2);
 p.chooseFuture({currentTarget:{dataset:{annual:5691.6}}});assert.equal(p.data.result.chosen.annual,5691.6);p.onHide();assert.equal(page('resident/pages/calc/calc.js',store).data.form.cdResidence,'urban');
 p.edit();p.setData({'form.accountMode':'balance','form.balance':'30000','form.pastAnnual':'1138.32'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.openingAmount,'30000.00');
 p.regionChoice({detail:{regionId:'330100'}});assert.equal(p.data.result,null);assert.equal(p.data.form.cdResidence,'unknown');assert.equal(p.data.form.tier,300);assert.equal(p.data.form.eligible,'unknown');
});
for(const c of registry.cities)test(c.name+'三入口页面可算、来源不串城、结果可返回修改',()=>{
 for(const file of ['pages/index/index.js','flexible/pages/calc/calc.js']){const p=page(file);p.regionChanged({detail:{regionId:c.id}});if(c.id==='440300')p.szScope({detail:{value:['yes']}});p.calculate();assert.equal(p.data.error,'',file);assert.equal(p.data.result.regionId,c.id);p.edit();assert.equal(p.data.result,null);}
 const p=page('resident/pages/calc/calc.js');p.regionChoice({detail:{regionId:c.id}});if(c.id==='510100')p.cdResidence({currentTarget:{dataset:{value:'rural'}}});p.setData({'form.ordinary':'yes','form.eligible':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.regionId||p.data.form.regionId,c.id);const before=p.data.form.years;p.edit();assert.equal(p.data.form.years,before);assert.equal(p.data.result,null);
 const sources=page('pages/policy/policy.js');sources.onLoad({city:c.id,kind:'resident'});assert.ok(sources.data.documents.length>0);
});
for(const c of provinces.municipalities){
 if(c.id==='440100')continue;
 test(c.name+'三个入口使用本省参数，居民明确标明省级参考',()=>{
  const p=registry.capability(c.id,'employee'),r=registry.capability(c.id,'resident');
  const e=forecast(employee({regionId:c.id,currentBase:String(p.min),szNonLocal:'yes'}));
  const flex=forecast(employee({regionId:c.id,currentBase:String(p.min),contributionType:'FLEXIBLE',szNonLocal:'yes'}));
  assert.equal(e.region,c.name);assert.equal(e.parameter.pensionBase,c.id==='440300'?11293:c.provinceId==='440000'?9493:6983);
  assert.equal(e.scenarios[0].monthlyPersonalPayment,c.provinceId==='440000'?'441.68':'336.38');
  assert.equal(flex.scenarios[0].monthlyPersonalPayment,c.provinceId==='440000'?'1104.20':'840.96');
  assert.equal(e.scenarios[0].futureAccountCredit,flex.scenarios[0].futureAccountCredit);
  const rr=resident(form({regionId:c.id,tier:r.tiers[0]}));assert.equal(rr.regionId,c.id);assert.match(rr.referenceLabel,/参考/);
  assert.equal(Number(rr.chosen.base),c.provinceId==='440000'?240:191);
  const ppage=page('pages/policy/policy.js');ppage.onLoad({city:c.id,kind:'resident'});assert.ok(ppage.data.documents.length>0);assert.ok(ppage.data.documents.every(d=>d.cityIds.includes(c.id)));
 });
}
test('广东延缴至65岁才补足：年缴与一次缴费分开，补足不发补贴',()=>{
 const r=resident(form({regionId:'440200',birth:'1971-10',years:'2',tier:360})),s=r.chosen;
 assert.equal(s.timeline.normalYears,9);assert.equal(s.lumpYears,4);assert.equal(s.lumpCost,'1440.00');assert.equal(s.total,'4680.00');assert.equal(s.subsidy,'270.00');assert.equal(s.account,'5670.00');assert.equal(s.receiptYear,2036);assert.equal(s.low,(240+5670/139).toFixed(2));
 const budget=resident(form({regionId:'440200',birth:'1971-10',years:'2',tier:360,budget:'1000'})).chosen;assert.equal(budget.affordable,false);assert.equal(budget.shortfall,'440.00');
 assert.throws(()=>resident(form({regionId:'440200',birth:'1961-10',years:'2',tier:360})),/延缴/);
});
test('广西不套广东65岁补足，历史金额不被高档覆盖',()=>{
 const r=resident(form({regionId:'450100',birth:'1971-10',years:'2',pastAnnual:'360',tier:6000})),s=r.chosen;
 assert.equal(r.openingAmount,'720.00');assert.equal(s.timeline.normalYears,13);assert.equal(s.lumpYears,0);assert.equal(s.total,'78000.00');assert.equal(s.subsidy,'2600.00');assert.equal(s.receiptYear,2039);assert.equal(s.low,(191+81320/139).toFixed(2));
 assert.throws(()=>resident(form({regionId:'450100',tier:360})),/档次/);
});
test('广西65岁加5元、超过15年加年限待遇，已有余额不重复入账',()=>{
 const r=resident(form({regionId:'450200',birth:'1966-10',years:'18',balance:'30000',tier:200}));assert.equal(r.chosen.base,'192.00');assert.equal(r.chosen.total,'0.00');assert.equal(r.openingAmount,'30000.00');
 const old=resident(form({regionId:'450200',birth:'1961-10',years:'18',balance:'30000',tier:200}));assert.equal(old.chosen.base,'197.00');
});
test('深圳身份未确认时明确拦截，不把深户按非深户20%计算',()=>{
 assert.throws(()=>forecast(employee({regionId:'440300',currentBase:'5521'})),/非深圳户籍/);
 for(const file of ['pages/index/index.js','flexible/pages/calc/calc.js']){const p=page(file);p.regionChanged({detail:{regionId:'440300'}});p.calculate();assert.equal(p.data.result,null);assert.match(p.data.error,/非深圳户籍/);p.szScope({detail:{value:['yes']}});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.regionId,'440300');}
});
test('省市切换后居民结果和确认项清空，广西年缴默认200元而不是广州360元',()=>{
 const p=page('resident/pages/calc/calc.js');p.regionChoice({detail:{regionId:'440200'}});p.setData({'form.ordinary':'yes','form.eligible':'yes'});p.calculate();assert.ok(p.data.result);p.regionChoice({detail:{regionId:'450100'}});assert.equal(p.data.result,null);assert.equal(p.data.form.tier,200);assert.equal(p.data.form.extended,'unknown');assert.equal(p.data.form.ordinary,'unknown');p.setData({'form.ordinary':'yes','form.eligible':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.regionId,'450100');
});

test('打开政策页隐藏工具时保存结果，重进工具仍保留地区和高档方案',()=>{
 const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:'450100'}});p.setData({'form.ordinary':'yes','form.eligible':'yes','form.tier':6000});p.calculate();assert.ok(p.data.result);const before=p.data.result.chosen.low;p.onHide();const reopened=page('resident/pages/calc/calc.js',store);assert.equal(reopened.data.result.chosen.low,before);assert.equal(reopened.data.form.regionId,'450100');assert.equal(reopened.data.form.tier,6000);
 for(const [file,key]of [['pages/index/index.js','employee'],['flexible/pages/calc/calc.js','flexible']]){const p=page(file,store);p.regionChanged({detail:{regionId:'450100'}});p.calculate();p.onHide();assert.ok(store[key].result);assert.equal(page(file,store).data.result.regionId,'450100');}
});


test('成都切为查询余额时历史月缴转成年缴，分段取加权年均，不能把月额当年额',()=>{
 const p=page('resident/pages/calc/calc.js');p.regionChoice({detail:{regionId:'510100'}});p.cdResidence({currentTarget:{dataset:{value:'rural'}}});p.setData({'form.pastMonthly':true,'form.pastAnnual':'100'});p.accountPicker({detail:{value:1}});assert.equal(p.data.form.pastAnnual,'1200.00');assert.equal(p.data.form.pastMonthly,false);
 p.setData({'form.historyMode':'segments','form.segments':[{start:'2022',end:'2023',annual:'1000'},{start:'2024',end:'2026',annual:'2000'}]});p.accountPicker({detail:{value:1}});assert.equal(p.data.form.pastAnnual,'1600.00');assert.equal(p.data.form.historyMode,'simple');
});
test('成都最低补贴生效月份与实际缴费年份不可提前，零年不能声称今年已缴',()=>{
 assert.throws(()=>resident(form({regionId:'510100',cdResidence:'rural',asOf:'2026-06',tier:1138.32})),/2026-07/);
 assert.throws(()=>resident(form({regionId:'510100',cdResidence:'rural',years:'15',paidThisYear:'no',tier:1138.32})),/2012/);
 assert.throws(()=>resident(form({regionId:'330100',years:'0',tier:300})),/至少1年/);
});

test('成都到60岁的档次展示补缴金额，不再把10%年缴单价当作到龄支付金额',()=>{
 const p=page('resident/pages/calc/calc.js');p.regionChoice({detail:{regionId:'510100'}});p.cdResidence({currentTarget:{dataset:{value:'rural'}}});assert.equal(p.data.cdLumpOnly,false);assert.match(p.data.tierLabels[0],/每年1138.32/);
 p.setData({'form.age':'60','form.years':'0','form.never':true,'form.paidThisYear':'no'});p.refreshPolicyQuestions();assert.equal(p.data.cdLumpOnly,true);assert.match(p.data.tierLabels[0],/10%档.*20489.40/);assert.match(p.data.tierLabels[4],/50%档.*102448.80/);
 p.setData({'form.years':'5','form.never':false});p.refreshPolicyQuestions();assert.match(p.data.tierLabels[0],/补10年约13659.60/);
});
