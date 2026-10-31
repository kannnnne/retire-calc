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
test('居民切换清除广州补贴及自费集体设置，普通资格必须重新确认',()=>{const p=page('resident/pages/calc/calc.js');p.setData({'form.usedSubsidy':'21600','form.noCollective':'yes','form.selfCollectiveTier':360,'form.ordinary':'yes'});p.regionChoice({detail:{regionId:'310100'}});assert.equal(p.data.form.usedSubsidy,'');assert.equal(p.data.form.selfCollectiveTier,0);assert.equal(p.data.form.ordinary,'unknown');assert.equal(p.data.form.eligible,'unknown');assert.equal(p.data.form.tier,800);p.setData({'form.ordinary':'yes','form.eligible':'yes','form.paidThisYear':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.region,'上海市');assert.equal(p.data.result.chosen.lumpYears,0);});
test('城市政策页只列该城市来源，未知城市或无已核对文档不能回退广州',()=>{const p=page('pages/policy/policy.js');p.onLoad({city:'310100',kind:'resident'});assert.ok(p.data.documents.length>=3);assert.ok(p.data.documents.every(d=>d.cityId==='310100'));p.onLoad({city:'510100',kind:'employee'});assert.ok(p.data.documents.length>=3);assert.ok(p.data.documents.every(d=>d.cityIds.includes('510100')));p.onLoad({city:'999999'});assert.equal(p.data.documents.length,0);});
test('切换到新城市时旧截至月仍可修改，计算明确阻断日期倒套',()=>{for(const relative of ['pages/index/index.js','flexible/pages/calc/calc.js']){const p=page(relative);p.setData({'form.dataAsOf':'2026-06'});p.regionChanged({detail:{regionId:'310100'}});assert.equal(p.data.regionReady,true);assert.match(p.data.error,/截至月份/);p.calculate();assert.equal(p.data.result,null);assert.match(p.data.error,/2026-08/);}});
test('北京延期领取按计划完成时的周岁，不能仅用年份相减误多算一岁',()=>{const r=resident(form({regionId:'110100',birth:'1971-12',tier:1000}));assert.equal(r.chosen.timeline.receivingAge,64);assert.equal(r.chosen.low,(998+(1800+10000+600)/109).toFixed(2));});
test('共享省市组件按行政码定位，不把居民省份数组下标当城市标识',()=>{let definition;const file=path.join(__dirname,'../miniprogram/components/region-picker/index.js');vm.runInNewContext(fs.readFileSync(file,'utf8'),{Component:d=>definition=d,wx:{navigateTo(){}},require:n=>require(path.resolve(path.dirname(file),n))});let selected;const component={...definition.methods,data:{...definition.data,value:'310100',kind:'resident'},setData(v){Object.assign(this.data,v);},triggerEvent(name,value){selected=value;}};component.sync();assert.equal(component.data.name,'上海市');assert.equal(component.data.pending,false);component.province({detail:{value:0}});assert.equal(selected.regionId,'110100');component.data.value='440100';component.sync();assert.equal(component.data.name,'广州市');assert.equal(component.data.provinces[0],'北京市');component.data.kind='employee';component.sync();assert.equal(component.data.provinces[0],'北京市');component.province({detail:{value:0}});assert.equal(selected.regionId,'110100');component.data.kind='resident';component.data.value='510100';component.sync();assert.equal(component.data.pending,false);assert.match(component.data.referenceLabel,/成都/);});

const provinces=require('../miniprogram/utils/province-policies');

test('省级参考按本省匹配，成都居民用独立市级公式覆盖四川职工参考',()=>{
 for(const id of ['330100','610100','510100']){const c=registry.city(id);assert.equal(c.employee.scope,'PROVINCE_REFERENCE');assert.equal(c.employee.policyProvinceId,c.provinceId);assert.equal(c.resident.policyProvinceId,c.provinceId);}
 assert.equal(registry.city('510100').resident.scope,'CITY_REFERENCE');
 assert.equal(registry.city('510100').resident.rule,'CHENGDU_REFERENCE');
 assert.equal(registry.city('330100').resident.scope,'CITY_REFERENCE');
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
test('西安居民使用本地239元和2026十档补贴，不再沿用陕西198元',()=>{
 const r=resident(form({regionId:'610100',tier:500}));assert.equal(r.chosen.base,'239.00');assert.equal(r.chosen.subsidy,'750.00');assert.equal(r.chosen.account,'7550.00');assert.equal(r.chosen.low,(239+7550/139).toFixed(2));assert.equal(r.chosen.lumpYears,0);assert.throws(()=>resident(form({regionId:'610100',tier:200})),/档次/);
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
 const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:'510100'}});p.setData({'form.ordinary':'yes','form.eligible':'yes','form.paidThisYear':'yes'});p.calculate();assert.match(p.data.error,/农村.*城镇/);
 p.cdResidence({currentTarget:{dataset:{value:'urban'}}});assert.equal(p.data.tiers.length,2);assert.equal(p.data.form.tier,4553.28);p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.scenarios.length,2);
 p.chooseFuture({currentTarget:{dataset:{annual:5691.6}}});assert.equal(p.data.result.chosen.annual,5691.6);p.onHide();assert.equal(page('resident/pages/calc/calc.js',store).data.form.cdResidence,'urban');
 p.edit();p.setData({'form.accountMode':'balance','form.balance':'30000','form.pastAnnual':'1138.32'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.openingAmount,'30000.00');
 p.regionChoice({detail:{regionId:'330100'}});assert.equal(p.data.result,null);assert.equal(p.data.form.cdResidence,'unknown');assert.equal(p.data.form.tier,300);assert.equal(p.data.form.eligible,'unknown');
});
for(const c of registry.cities)test(c.name+'三入口页面可算、来源不串城、结果可返回修改',()=>{
 for(const file of ['pages/index/index.js','flexible/pages/calc/calc.js']){const p=page(file);p.regionChanged({detail:{regionId:c.id}});if(c.id==='440300')p.szScope({detail:{value:['yes']}});p.calculate();assert.equal(p.data.error,'',file);assert.equal(p.data.result.regionId,c.id);p.edit();assert.equal(p.data.result,null);}
 const p=page('resident/pages/calc/calc.js');p.regionChoice({detail:{regionId:c.id}});if(c.id==='510100')p.cdResidence({currentTarget:{dataset:{value:'rural'}}});p.setData({'form.ordinary':'yes','form.eligible':'yes','form.paidThisYear':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.regionId||p.data.form.regionId,c.id);const before=p.data.form.years;p.edit();assert.equal(p.data.form.years,before);assert.equal(p.data.result,null);
 const sources=page('pages/policy/policy.js');sources.onLoad({city:c.id,kind:'resident'});assert.ok(sources.data.documents.length>0);
});
for(const c of provinces.municipalities){
 if(c.id==='440100')continue;
 test(c.name+'三个入口使用已核参数，居民注明本地或省级参考',()=>{
  const p=registry.capability(c.id,'employee'),r=registry.capability(c.id,'resident');
  const e=forecast(employee({regionId:c.id,currentBase:String(p.min),szScopeConfirmed:'yes'}));
  const flex=forecast(employee({regionId:c.id,currentBase:String(p.min),contributionType:'FLEXIBLE',szScopeConfirmed:'yes'}));
  assert.equal(e.region,c.name);assert.equal(e.parameter.pensionBase,c.id==='440300'?11293:c.provinceId==='440000'?9493:6983);
  assert.equal(e.scenarios[0].monthlyPersonalPayment,c.provinceId==='440000'?'441.68':'336.38');
  assert.equal(flex.scenarios[0].monthlyPersonalPayment,c.provinceId==='440000'?'1104.20':'840.96');
  assert.equal(e.scenarios[0].futureAccountCredit,flex.scenarios[0].futureAccountCredit);
  const rr=resident(form({regionId:c.id,tier:r.tiers[0]}));assert.equal(rr.regionId,c.id);assert.match(rr.referenceLabel,/参考/);
  assert.equal(Number(rr.chosen.base),({'441900':330,'440600':343,'440400':543,'440300':240,'440700':242.5,'442000':250,'440500':250,'445300':242,'441800':245})[c.id]||(c.provinceId==='440000'?240:191));
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
 const p=page('resident/pages/calc/calc.js');p.regionChoice({detail:{regionId:'440200'}});p.setData({'form.ordinary':'yes','form.eligible':'yes','form.paidThisYear':'yes'});p.calculate();assert.ok(p.data.result);p.regionChoice({detail:{regionId:'450100'}});assert.equal(p.data.result,null);assert.equal(p.data.form.tier,200);assert.equal(p.data.form.extended,'unknown');assert.equal(p.data.form.ordinary,'unknown');p.setData({'form.ordinary':'yes','form.eligible':'yes','form.paidThisYear':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.regionId,'450100');
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


test('杭州明确区分市区和三县市，市区补贴和年限待遇不串到省参考',()=>{
 const urban=resident(form({regionId:'330100',localArea:'urban',tier:7000})).chosen;
 assert.equal(urban.timeline.normalYears,4);assert.equal(urban.lumpYears,6);assert.equal(urban.lumpUnit,'5000.00');assert.equal(urban.lumpCost,'30000.00');assert.equal(urban.total,'58000.00');assert.equal(urban.subsidy,'3600.00');assert.equal(urban.account,'63400.00');assert.equal(urban.base,'420.00');assert.equal(urban.low,(420+63400/139).toFixed(2));assert.equal(urban.receiptYear,2031);
 const county=resident(form({regionId:'330100',localArea:'county',tier:7000}));assert.equal(county.chosen.base,'240.00');assert.equal(county.chosen.lumpYears,0);assert.equal(county.chosen.subsidy,'6000.00');assert.match(county.referenceLabel,/省级/);assert.match(county.region,/桐庐/);
 assert.throws(()=>resident(form({regionId:'330100',localArea:'made-up',tier:300})),/所在地/);assert.throws(()=>resident(form({regionId:'610100',localArea:'urban',tier:300})),/分区/);
});

test('杭州60岁前后补缴边界、最高5000和无补贴，过去余额不被改档',()=>{
 const at60=resident(form({regionId:'330100',localArea:'urban',birth:'1966-10',tier:5000,balance:'30000'})).chosen;
 assert.equal(at60.timeline.normalYears,0);assert.equal(at60.lumpYears,10);assert.equal(at60.lumpCost,'50000.00');assert.equal(at60.subsidy,'0.00');assert.equal(at60.account,'80000.00');assert.equal(at60.base,'420.00');
 assert.throws(()=>resident(form({regionId:'330100',localArea:'urban',birth:'1966-10',tier:7000})),/最高5000/);
 const before=resident(form({regionId:'330100',localArea:'urban',birth:'1966-12',tier:7000,paidThisYear:'no'})).chosen;
 assert.equal(before.timeline.normalYears,1);assert.equal(before.lumpYears,9);assert.equal(before.total,'52000.00');assert.equal(before.subsidy,'900.00');
 for(const tier of [300,500,1000,2000,3000,5000,7000])assert.equal(resident(form({regionId:'330100',localArea:'urban',tier})).openingAmount,'1800.00');
});

test('杭州分段年限与高龄加发独立计算，不把每年费率直接乘全部年数',()=>{
 const rules=require('../miniprogram/utils/local-resident-policies'),policy=rules.resolve(registry.capability('330100','resident'),'urban');
 for(const [years,expected]of [[0,0],[5,5],[6,7],[10,15],[11,18],[15,30],[16,35],[20,55]])assert.equal(rules.tenureExtra(policy,years),expected);
 for(const [birth,base]of [['1961-10','430.00'],['1956-10','435.00']])assert.equal(resident(form({regionId:'330100',localArea:'urban',birth,years:'15',tier:300,balance:'30000'})).chosen.base,base);
});

test('深圳和中山使用各自九档补贴，新增年龄档不叠加，补缴不发补贴',()=>{
 for(const [id,credits]of [['440300',[30,40,50,70,80,90,100,120,150]],['442000',[60,60,60,90,90,120,120,150,150]]]){
  for(const [i,tier]of registry.capability(id,'resident').tiers.entries()){
   const s=resident(form({regionId:id,tier})).chosen;
   assert.equal(Number(s.subsidy),credits[i]*s.timeline.normalYears);assert.equal(Number(s.lumpCost),tier*s.lumpYears);assert.match(resident(form({regionId:id,tier})).referenceText,id==='440300'?/省级下限240/:/官方图解明确基础养老金240/);
  }
 }
 const rules=require('../miniprogram/utils/local-resident-policies');
 for(const [age,expected]of [[64,0],[65,10],[70,15],[75,20],[80,25],[85,30]])assert.equal(rules.ageExtra(registry.capability('442000','resident'),age),expected);
 assert.equal(rules.ageExtra(registry.capability('440300','resident'),80),100);
 const s=resident(form({regionId:'440300',tier:4800,paidThisYear:'no'})).chosen;
 assert.equal(s.schedule[0].year,2026);assert.equal(s.schedule[0].subsidy,'0.00');assert.match(resident(form({regionId:'440300',tier:4800,paidThisYear:'no'})).warnings.join(''),/1月已过/);
});

test('杭州页面所在地切换、年龄改到60后纠正补缴档，重新进入保留所选方案',()=>{
 const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:'330100'}});p.localArea({detail:{value:1}});
 assert.equal(p.data.region.base,390);assert.equal(p.data.region.subsidies[6],900);p.setData({'form.ordinary':'yes','form.eligible':'yes','form.tier':7000});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.lumpUnit,'5000.00');p.onHide();
 const reopened=page('resident/pages/calc/calc.js',store);assert.equal(reopened.data.form.localArea,'urban');assert.ok(reopened.data.result);assert.equal(reopened.data.region.base,390);
 reopened.edit();reopened.input({currentTarget:{dataset:{key:'age'}},detail:{value:'60'}});assert.equal(reopened.data.tiers.length,6);assert.equal(reopened.data.form.tier,5000);assert.match(reopened.data.tierLabels[5],/补10年/);
 reopened.localArea({detail:{value:2}});assert.equal(reopened.data.result,null);assert.equal(reopened.data.region.base,240);assert.equal(reopened.data.form.ordinary,'unknown');assert.equal(reopened.data.tiers.length,7);
 reopened.regionChoice({detail:{regionId:'610100'}});assert.equal(reopened.data.form.localArea,'');assert.equal(reopened.data.region.base,239);assert.equal(reopened.data.areaLabels.length,1);
});

test('杭州本地来源在政策页可查，参保分区不会改变另两类工具参数',()=>{
 const p=page('pages/policy/policy.js');p.onLoad({city:'330100',kind:'resident'});for(const id of ['hz-resident-2024','hz-resident-subsidy-2026','hz-resident-tenure','hz-resident-base-2026'])assert.ok(p.data.documents.some(d=>d.id===id));assert.ok(p.data.documents.every(d=>d.cityIds.includes('330100')));
 assert.equal(registry.capability('330100','employee').pensionBase,8537);assert.equal(registry.capability('330100','flexible').pensionBase,8537);
 assert.equal(registry.capability('440200','resident').subsidies[6],60);assert.equal(registry.capability('450100','resident').base,186);
});


test('中山老制度边界必须核对，不直接安排普通延缴付款',()=>{
 assert.throws(()=>resident(form({regionId:'442000',birth:'1966-10',tier:360})),/2011年11月/);
 const r=resident(form({regionId:'442000',birth:'1966-10',tier:360,transition:'no'}));assert.ok(r.chosen);
 assert.ok(resident(form({regionId:'442000',birth:'1966-11',tier:360})).chosen);
 const p=page('resident/pages/calc/calc.js');p.regionChoice({detail:{regionId:'442000'}});p.input({currentTarget:{dataset:{key:'age'}},detail:{value:'60'}});assert.equal(p.data.needsTransition,true);
});

test('深圳不能把今年已过的1月当成已缴，也不重复发补贴',()=>{
 const r=resident(form({regionId:'440300',birth:'1961-03',tier:360,paidThisYear:'no',extended:'yes'}));assert.equal(r.chosen.timeline.normalYears,0);assert.equal(r.chosen.lumpYears,10);assert.equal(r.chosen.subsidy,'0.00');assert.equal(r.chosen.base,'290.00');
 const early=resident(form({regionId:'440300',birth:'1971-10',asOf:'2026-01',tier:360,paidThisYear:'no'}));assert.equal(early.chosen.schedule[0].subsidy,'50.00');
});

test('共享地区提示跟随杭州所在地，切换城市的属性先后更新不抛错',()=>{
 let definition;const file=path.join(__dirname,'../miniprogram/components/region-picker/index.js');vm.runInNewContext(fs.readFileSync(file,'utf8'),{Component:d=>definition=d,wx:{navigateTo(){}},require:n=>require(path.resolve(path.dirname(file),n))});
 const c={...definition.methods,data:{...definition.data,value:'330100',kind:'resident',residentArea:'urban'},setData(v){Object.assign(this.data,v);}};c.sync();assert.match(c.data.referenceLabel,/市区/);assert.match(c.data.referenceText,/5000/);c.data.value='610100';assert.doesNotThrow(()=>c.sync());assert.match(c.data.referenceText,/239/);
});


test('云浮采用2026长缴5元和年龄2/5/8元，汕头65岁加10元不借用邻市',()=>{
 const s=resident(form({regionId:'445300',birth:'1961-10',years:'18',balance:'30000',tier:360})).chosen;assert.equal(s.base,'257.00');assert.equal(s.total,'0.00');
 const younger=resident(form({regionId:'445300',birth:'1966-10',years:'18',balance:'30000',tier:360})).chosen;assert.equal(younger.base,'255.00');
 const rules=require('../miniprogram/utils/local-resident-policies');for(const [age,extra]of [[64,0],[65,2],[74,2],[75,5],[84,5],[85,8]])assert.equal(rules.ageExtra(registry.capability('445300','resident'),age),extra);
 const st=resident(form({regionId:'440500',birth:'1961-10',years:'18',balance:'30000',tier:360})).chosen;assert.equal(st.base,'259.00');assert.equal(registry.capability('440600','resident').ageExtras,undefined);
});

test('韶关和湛江同为240元有本地确认原文，来源不会误发给其他城市',()=>{
 for(const [id,source]of [['440200','sg-resident-base-2025'],['440800','zhanjiang-resident-rule-2025'],['440500','st-resident-age-2025'],['445300','yf-resident-rule-2026']]){
  const p=page('pages/policy/policy.js');p.onLoad({city:id,kind:'resident'});assert.ok(p.data.documents.some(x=>x.id===source));assert.ok(p.data.documents.every(x=>x.cityIds.includes(id)));assert.equal(registry.capability(id,'resident').base,240);
 }
});


test('东莞2026新领取人员不计旧50元年龄加发，其他城市不受影响',()=>{
 const rules=require('../miniprogram/utils/local-resident-policies'),p=registry.capability('441900','resident');
 for(const age of [60,65,70,75,85])assert.equal(rules.ageExtra(p,age),0);
 const r=resident(form({regionId:'441900',birth:'1961-10',years:'15',tier:360,balance:'30000'}));assert.equal(r.chosen.base,'330.00');assert.match(r.referenceText,/此前已领取人员不适用/);assert.ok(r.sources.some(s=>s.id==='dg-resident-new-receipt-2026'));
 assert.equal(rules.ageExtra(registry.capability('440300','resident'),65),50);
});

test('汕尾和河源市级最低额、九档及补贴逐档校验，不改历史余额',()=>{
 for(const id of ['441500','441600'])for(const tier of [180,240,360,600,900,1200,1800,3600,4800]){
  const r=resident(form({regionId:id,tier,balance:'30000'})),s=r.chosen;
  assert.equal(s.base,'240.00');assert.equal(s.timeline.normalYears,9);assert.equal(s.lumpYears,1);assert.equal(Number(s.lumpCost),tier);
  assert.equal(Number(s.subsidy),(tier<=360?30:60)*9);assert.equal(Number(s.account),30000+tier*10+Number(s.subsidy));assert.equal(s.timeline.lumpMonth,'2036-10');assert.equal(r.openingAmount,'30000.00');
 }
});

test('河源新办法按生效月份使用，65岁补足须核对延缴，不能重新开放旧趸缴',()=>{
 const original=registry.capability('441600','resident').sources.find(s=>s.id==='hy-resident-original-2026');
 assert.match(original.url,/118668\/709920.pdf$/);assert.match(original.text,/第十条/);assert.match(original.text,/次月领取/);assert.match(original.text,/中断补缴无政府补贴/);assert.match(original.text,/当前4800元补缴的权限/);

 assert.throws(()=>resident(form({regionId:'441600',asOf:'2026-07',tier:360})),/2026-08/);
 assert.ok(resident(form({regionId:'441600',asOf:'2026-08',tier:360})).chosen);
 assert.throws(()=>resident(form({regionId:'441600',birth:'1961-10',tier:360})),/已按规定延缴/);
 const r=resident(form({regionId:'441600',birth:'1966-10',tier:360}));assert.equal(r.chosen.timeline.receivingAge,65);assert.equal(r.chosen.timeline.normalYears,4);assert.equal(r.chosen.lumpYears,6);assert.match(r.warnings.join(''),/2026年7月31日.*已截止/);
});

test('汕尾和河源长缴下限及新来源只出现在相应城市政策页',()=>{
 for(const [id,ids]of [['441500',['sw-resident-rule-2026','sw-resident-base-2025']],['441600',['hy-resident-rule-2026','hy-resident-original-2026','hy-resident-base-2025','hy-zijin-old-lump-deadline']]]){
  const r=resident(form({regionId:id,birth:'1961-10',years:'18',tier:360,balance:'30000'}));assert.equal(r.chosen.base,'249.00');assert.equal(r.chosen.total,'0.00');
  const p=page('pages/policy/policy.js');p.onLoad({city:id,kind:'resident'});for(const source of ids)assert.ok(p.data.documents.some(x=>x.id===source));assert.ok(p.data.documents.every(x=>x.cityIds.includes(id)));
 }
 const p=page('pages/policy/policy.js');p.onLoad({city:'450100',kind:'resident'});assert.ok(p.data.documents.every(x=>!x.id.startsWith('hy-')&&!x.id.startsWith('sw-')));
});


test('珠海四档按月档乘12年缴，补贴65%，60岁补足不冒用省九档',()=>{
 for(const [tier,credit]of [[720,468],[1200,780],[1440,936],[1800,1170]]){
  const r=resident(form({regionId:'440400',tier,balance:'30000'})),s=r.chosen;
  assert.equal(s.timeline.normalYears,4);assert.equal(s.lumpYears,6);assert.equal(Number(s.lumpCost),tier*6);assert.equal(Number(s.subsidy),credit*4);assert.equal(Number(s.total),tier*10);assert.equal(Number(s.account),30000+tier*10+credit*4);assert.equal(s.timeline.lumpAge,60);assert.equal(s.receiptYear,2031);assert.equal(s.base,'543.00');assert.equal(s.low,(543+Number(s.account)/139).toFixed(2));assert.doesNotMatch(s.schedule.at(-1).type,/5000|65岁/);
 }
 assert.throws(()=>resident(form({regionId:'440400',tier:360})),/当地缴费档次/);
});

test('珠海到龄首次领取使用对应年龄计发月数，趸缴无65%补贴',()=>{
 for(const [birth,base,divisor]of [['1966-10',543,139],['1961-10',553,101],['1956-10',553,56]]){
  const r=resident(form({regionId:'440400',birth,tier:1800,balance:'30000'})),s=r.chosen;
  assert.equal(s.timeline.normalYears,0);assert.equal(s.lumpCost,'18000.00');assert.equal(s.subsidy,'0.00');assert.equal(s.account,'48000.00');assert.equal(Number(s.base),base);assert.equal(s.low,(base+48000/divisor).toFixed(2));assert.equal(s.timeline.lumpMonth,'2026-10');assert.equal(s.receiptYear,2026);
 }
 const r=resident(form({regionId:'440400',birth:'1961-10',years:'18',tier:720,balance:'30000'}));assert.equal(r.chosen.base,'562.00');assert.equal(r.chosen.total,'0.00');
});

test('珠海12月补足应次年起领，预算只判断趸缴，历史余额不随档次改动',()=>{
 const spring=resident(form({regionId:'440400',birth:'1971-03',asOf:'2026-12',tier:720}));assert.equal(spring.chosen.timeline.lumpMonth,'2031-03');assert.equal(spring.chosen.receiptYear,2031);
 const r=resident(form({regionId:'440400',birth:'1966-12',paidThisYear:'yes',tier:1800,asOf:'2026-12',balance:'30000',budget:'17999'}));assert.equal(r.chosen.receiptYear,2027);assert.equal(r.chosen.shortfall,'1.00');assert.equal(r.chosen.affordable,false);assert.ok(r.scenarios.every(s=>s.account===String((30000+Number(s.lumpCost)).toFixed(2))));
});

test('珠海页面四档、60岁趸缴标签、历史输入与会话恢复一致',()=>{
 const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:'440400'}});assert.deepEqual(Array.from(p.data.tiers),[720,1200,1440,1800]);p.setData({'form.eligible':'yes','form.ordinary':'yes','form.age':'60','form.tier':1800});p.refreshPolicyQuestions();assert.equal(p.data.needsExtended,false);assert.match(p.data.tierLabels[3],/补10年 × 1800/);p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.lumpCost,'18000.00');p.onHide();const reopened=page('resident/pages/calc/calc.js',store);assert.equal(reopened.data.form.regionId,'440400');assert.equal(reopened.data.result.chosen.lumpCost,'18000.00');assert.equal(reopened.data.result.scenarios.length,4);
 const policy=page('pages/policy/policy.js');policy.onLoad({city:'440400',kind:'resident'});assert.ok(policy.data.documents.some(x=>x.id==='zh-resident-renewal-2026'));assert.match(policy.data.documents.find(x=>x.id==='zh-resident-base-conference-2025').publisher,/非调标通知原件/);assert.ok(policy.data.documents.every(x=>x.cityIds.includes('440400')));
});


test('珠海按首次领取月份计算年龄，不漏生日当月的年龄加发及计发月数',()=>{
 const r=resident(form({regionId:'440400',birth:'1961-10',asOf:'2026-09',years:'15',tier:720,balance:'30000'}));assert.equal(r.chosen.timeline.receivingAge,65);assert.equal(r.chosen.base,'553.00');assert.equal(r.chosen.low,(553+30000/101).toFixed(2));
 assert.throws(()=>resident(form({regionId:'440400',birth:'1955-10',asOf:'2026-09',years:'15',tier:720,balance:'30000'})),/超过70岁/);
});

test('阳江新通知及市级解读核九档、补贴、长缴和执行省最低',()=>{
 for(const tier of [180,240,360,600,900,1200,1800,3600,4800]){const r=resident(form({regionId:'441700',tier}));assert.equal(Number(r.chosen.subsidy),(tier<=360?30:60)*9);assert.match(r.referenceText,/全市基础养老金补助执行国家和省最低标准/);assert.ok(r.sources.some(s=>s.id==='yj-resident-rule-2026'));}
 const r=resident(form({regionId:'441700',birth:'1961-10',years:'18',tier:360,balance:'30000'}));assert.equal(r.chosen.base,'249.00');assert.equal(r.chosen.total,'0.00');
});


test('佛山11档及最后公开补贴，65岁按101计发，不套省级九档或旧基础额',()=>{
 for(const tier of [360,480,600,720,840,960,1200,1800,2400,3600,4800]){const r=resident(form({regionId:'440600',tier,balance:'30000'})),x=r.chosen;assert.equal(x.timeline.normalYears,9);assert.equal(x.lumpYears,1);assert.equal(Number(x.subsidy),(tier===360?36:60)*9);assert.equal(Number(x.account),30000+tier*10+Number(x.subsidy));assert.equal(x.base,'343.00');assert.equal(x.low,(343+Number(x.account)/101).toFixed(2));}
 assert.throws(()=>resident(form({regionId:'440600',tier:180})),/当地缴费档次/);
 const x=resident(form({regionId:'440600',birth:'1966-10',tier:4800})).chosen;assert.equal(x.timeline.receivingAge,65);assert.equal(x.lumpYears,6);assert.equal(x.lumpUnit,'4800.00');
});

test('佛山2026调档批扣后须确认今年档次，未来方案不改今年未缴费用',()=>{
 assert.throws(()=>resident(form({regionId:'440600',paidThisYear:'no',tier:4800})),/今年实际/);
 assert.throws(()=>resident(form({regionId:'440600',paidThisYear:'no',tier:4800,currentYearTier:180})),/今年实际/);
 const r=resident(form({regionId:'440600',paidThisYear:'no',tier:4800,currentYearTier:360})),x=r.chosen;assert.equal(x.schedule[0].cost,'360');assert.equal(x.schedule[0].subsidy,'36.00');assert.equal(x.total,'43560.00');assert.equal(x.subsidy,'576.00');assert.equal(x.timeline.normalCost,'43560.00');assert.equal(x.timeline.futureNormalYears,9);assert.equal(x.timeline.futureFirstYear,2027);assert.equal(x.timeline.lockedYear,2026);assert.ok(r.scenarios.every(s=>s.schedule[0].cost==='360'));
 const early=resident(form({regionId:'440600',paidThisYear:'no',asOf:'2026-07',tier:4800}));assert.equal(early.chosen.schedule[0].cost,'4800');assert.equal(early.chosen.timeline.lockedYear,null);
 const next=resident(form({regionId:'440600',paidThisYear:'no',asOf:'2027-01',tier:4800}));assert.equal(next.chosen.timeline.lockedYear,null);
 const last=resident(form({regionId:'440600',years:'14',paidThisYear:'no',tier:4800,currentYearTier:360}));assert.equal(last.chosen.timeline.futureNormalYears,0);assert.equal(last.chosen.total,'360.00');assert.ok(last.scenarios.every(s=>s.low===last.chosen.low));
});

test('佛山今年档次不改变趸缴或他市费用，领取资格和来源仍分清',()=>{
 const x=resident(form({regionId:'440600',birth:'1961-10',paidThisYear:'no',tier:1200,extended:'yes'})).chosen;assert.equal(x.timeline.normalYears,0);assert.equal(x.lumpCost,'12000.00');assert.equal(x.subsidy,'0.00');assert.equal(x.timeline.lockedYear,null);
 assert.throws(()=>resident(form({regionId:'440600',birth:'1961-10',tier:1200})),/延缴/);
 const r=resident(form({regionId:'441500',paidThisYear:'no',tier:360,currentYearTier:4800}));assert.equal(r.chosen.schedule[0].cost,'360');assert.equal(r.chosen.timeline.lockedYear,null);
 const p=page('pages/policy/policy.js');p.onLoad({city:'440600',kind:'resident'});for(const id of ['fs-resident-tiers-base-2025','fs-resident-subsidy-age-divisor','fs-resident-annual-tenure','fs-resident-tier-deadline-2026'])assert.ok(p.data.documents.some(x=>x.id===id));
});

test('佛山只在需要时显示今年实际档，切换城市清除，保存后恢复',()=>{
 const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:'440600'}});assert.equal(p.data.tiers.length,11);assert.equal(p.data.needsCurrentYearTier,false);p.choice({currentTarget:{dataset:{key:'paidThisYear',value:'no'}}});assert.equal(p.data.needsCurrentYearTier,true);p.currentYearTier({detail:{value:2}});assert.equal(p.data.form.currentYearTier,480);p.setData({'form.eligible':'yes','form.ordinary':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.timeline.lockedAnnual,480);p.onHide();const restored=page('resident/pages/calc/calc.js',store);assert.equal(restored.data.form.currentYearTier,480);restored.regionChoice({detail:{regionId:'440400'}});assert.equal(restored.data.form.currentYearTier,0);assert.equal(restored.data.needsCurrentYearTier,false);
});


test('广西14市均可查看补缴原件和历史档次限制，贵港档次来源不串其他市',()=>{
 for(const c of registry.cities.filter(x=>x.provinceId==='450000')){const p=page('pages/policy/policy.js');p.onLoad({city:c.id,kind:'resident'});for(const id of ['gx-resident-makeup-2023','gx-resident-historical-tiers'])assert.ok(p.data.documents.some(x=>x.id===id));const r=resident(form({regionId:c.id,tier:6000}));assert.equal(r.chosen.lumpYears,0);assert.match(r.referenceText,/制度过渡.*未核定时不自动开放/);assert.equal(p.data.documents.some(x=>x.id==='gg-resident-tier-local'),c.id==='450800');}
});


test('广西补缴单页只列相应历史档，金额和资格修改后重新核对，结果与换档恢复一致',()=>{
 const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:'450100'}});assert.equal(p.data.region.gxMakeup,true);assert.equal(p.data.gxUiRows.length,0);p.gxAdd();
 const input=(key,value)=>p.gxInput({currentTarget:{dataset:{index:0,key}},detail:{value}});
 input('start','2018');input('end','2019');input('original','200');assert.equal(p.data.gxUiRows[0].tiers.at(-1),2000);assert.ok(!p.data.gxUiRows[0].tiers.includes(6000));
 input('start','2019');input('end','2022');assert.equal(p.data.gxUiRows[0].tiers.at(-1),6000);p.gxTarget({currentTarget:{dataset:{index:0}},detail:{value:p.data.gxUiRows[0].tiers.length}});assert.equal(p.data.form.gxMakeupRows[0].target,6000);
 p.setData({'form.paidThisYear':'yes','form.pastAnnual':'200','form.gxStartYear':'2012','form.gxScopeReviewed':'yes','form.eligible':'yes','form.ordinary':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.immediateCost,'23200.00');assert.equal(p.data.result.openingAmount,'1000.00');p.chooseFuture({currentTarget:{dataset:{annual:6000}}});assert.equal(p.data.result.chosen.immediateCost,'23200.00');assert.equal(p.data.result.openingAmount,'1000.00');p.onHide();
 const reopened=page('resident/pages/calc/calc.js',store);assert.equal(reopened.data.result.chosen.annual,6000);assert.equal(reopened.data.form.gxMakeupRows[0].target,6000);assert.equal(reopened.data.result.makeup.cost,'23200.00');reopened.edit();reopened.input({currentTarget:{dataset:{key:'gxStartYear'}},detail:{value:'2013'}});assert.equal(reopened.data.form.gxScopeReviewed,'unknown');reopened.gxRemove({currentTarget:{dataset:{index:0}}});assert.equal(reopened.data.gxUiRows.length,0);
 reopened.gxAdd();reopened.regionChoice({detail:{regionId:'440600'}});assert.equal(reopened.data.form.gxMakeupRows.length,0);assert.equal(reopened.data.form.gxStartYear,'');assert.equal(reopened.data.gxMakeupOpen,false);
});

test('广西补断缴与当前年提档的页面字段区分，删除记录后普通计算不受影响',()=>{
 const p=page('resident/pages/calc/calc.js');p.setData({'form.makeupStrategy':'ANNUAL_ONLY'});p.regionChoice({detail:{regionId:'450300'}});p.gxAdd();p.gxMode({currentTarget:{dataset:{index:0}},detail:{value:0}});assert.equal(p.data.form.gxMakeupRows[0].mode,'missing');assert.equal(p.data.gxUiRows[0].currentUpgrade,false);
 p.gxMode({currentTarget:{dataset:{index:0}},detail:{value:1}});p.gxInput({currentTarget:{dataset:{index:0,key:'start'}},detail:{value:'2026'}});p.gxInput({currentTarget:{dataset:{index:0,key:'end'}},detail:{value:'2026'}});assert.equal(p.data.gxUiRows[0].currentUpgrade,true);p.gxRemove({currentTarget:{dataset:{index:0}}});p.setData({'form.eligible':'yes','form.ordinary':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.makeup,null);assert.equal(p.data.result.chosen.total,'2000.00');
});

test('清远九档与长缴、年龄加发按市级原文，不与省参考或其他市混用',()=>{
 for(const tier of [180,240,360,600,900,1200,1800,3600,4800]){const r=resident(form({regionId:'441800',tier}));assert.equal(Number(r.chosen.subsidy),(tier<=360?30:60)*9);assert.equal(r.chosen.base,'245.00');assert.match(r.referenceText,/基础最低240元/);assert.ok(r.sources.some(s=>s.id==='qy-resident-local-rule'));}
 const r=resident(form({regionId:'441800',birth:'1961-10',years:'18',tier:360,balance:'30000'}));assert.equal(r.chosen.base,'254.00');assert.equal(r.chosen.total,'0.00');
 const local=require('../miniprogram/utils/local-resident-policies'),p=registry.city('441800').resident;
 for(const [age,amount]of [[64,0],[65,5],[79,5],[80,10],[90,10]])assert.equal(local.ageExtra(p,age),amount);
});

test('清远2026三月底调档期限与年缴分开，未来换档不改变今年确认费用',()=>{
 assert.throws(()=>resident(form({regionId:'441800',paidThisYear:'no',asOf:'2026-04',tier:4800})),/今年实际/);
 const early=resident(form({regionId:'441800',paidThisYear:'no',asOf:'2026-03',tier:4800}));assert.equal(early.chosen.timeline.lockedYear,null);
 const r=resident(form({regionId:'441800',paidThisYear:'no',asOf:'2026-04',tier:4800,currentYearTier:360}));assert.equal(r.chosen.total,'43560.00');assert.equal(r.chosen.subsidy,'570.00');assert.equal(r.chosen.timeline.lockedAnnual,360);assert.equal(r.chosen.timeline.futureFirstYear,2027);assert.ok(r.scenarios.every(s=>s.schedule[0].cost==='360'));
 const next=resident(form({regionId:'441800',paidThisYear:'no',asOf:'2027-04',tier:4800}));assert.equal(next.chosen.timeline.lockedYear,null);
 assert.throws(()=>resident(form({regionId:'441800',birth:'1961-10',tier:360})),/延缴/);
});

test('清远当年档页面保留与来源隔离，汕头困难群体补足不套给普通人员',()=>{
 const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:'441800'}});p.choice({currentTarget:{dataset:{key:'paidThisYear',value:'no'}}});assert.equal(p.data.needsCurrentYearTier,true);p.currentYearTier({detail:{value:3}});p.setData({'form.eligible':'yes','form.ordinary':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.timeline.lockedAnnual,360);p.onHide();assert.equal(page('resident/pages/calc/calc.js',store).data.form.currentYearTier,360);
 const q=page('pages/policy/policy.js');q.onLoad({city:'441800',kind:'resident'});for(const id of ['qy-resident-local-rule','qy-resident-rule-budget-2026','qy-resident-tier-deadline-2026'])assert.ok(q.data.documents.some(x=>x.id===id));q.onLoad({city:'445200',kind:'resident'});assert.ok(q.data.documents.every(x=>!x.id.startsWith('qy-')));
 const st=resident(form({regionId:'440500',birth:'1966-10',tier:360}));assert.equal(st.chosen.timeline.lumpAge,65);assert.ok(st.sources.some(x=>x.id==='st-resident-rule-2025'));assert.match(st.referenceText,/困难群体/);
});

test('清远旧139月结果重进清金额保输入，按首次领取年龄重算后可保留',()=>{
 const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:'441800'}});
 p.setData({'form.ageOnly':false,'form.birth':'1961-10','form.asOf':'2026-10','form.years':'15','form.balance':'30000','form.accountMode':'balance','form.eligible':'yes','form.ordinary':'yes','form.paidThisYear':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.low,(245+30000/101).toFixed(2));p.onHide();
 delete store.resident.result.ageDivisor;store.resident.compare=true;store.resident.result.chosen.low=(245+30000/139).toFixed(2);
 const next=page('resident/pages/calc/calc.js',store);assert.equal(next.data.result,null);assert.equal(next.data.baseline,null);assert.equal(next.data.display,null);assert.equal(next.data.planOptions.length,0);assert.equal(next.data.compare,false);assert.match(next.data.error,/清远领取年龄规则/);assert.equal(next.data.form.birth,'1961-10');assert.equal(next.data.form.balance,'30000');assert.equal(next.data.region.ageDivisor,true);
 next.calculate();assert.equal(next.data.error,'');assert.equal(next.data.result.ageDivisor,true);assert.equal(next.data.result.chosen.low,(245+30000/101).toFixed(2));next.onHide();assert.ok(page('resident/pages/calc/calc.js',store).data.result);
});

test('清远页面交足后继续缴费可选，改未来档并切走保留方案，历史账户不改',()=>{
 const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:'441800'}});
 p.setData({'form.ageOnly':false,'form.birth':'1971-10','form.asOf':'2026-10','form.years':'15','form.balance':'30000','form.accountMode':'balance','form.tier':360,'form.eligible':'yes','form.ordinary':'yes','form.paidThisYear':'yes'});p.refreshPolicyQuestions();assert.equal(p.data.canContinueTo60,true);p.calculate();assert.equal(p.data.result.chosen.total,'0.00');
 p.payUntil({detail:{value:1}});assert.equal(p.data.error,'');assert.equal(p.data.form.payUntil,'SIXTY');assert.equal(p.data.result.chosen.total,'1440.00');assert.equal(p.data.result.chosen.timeline.finalYears,19);assert.equal(p.data.result.chosen.base,'252.00');
 p.chooseFuture({currentTarget:{dataset:{annual:4800}}});assert.equal(p.data.result.openingAmount,'30000.00');assert.equal(p.data.result.chosen.total,'19200.00');assert.equal(p.data.result.chosen.subsidy,'240.00');assert.equal(p.data.result.chosen.interest.accountWithoutInterest,'49440.00');p.onHide();
 const next=page('resident/pages/calc/calc.js',store);assert.equal(next.data.form.payUntil,'SIXTY');assert.equal(next.data.result.chosen.total,'19200.00');assert.equal(next.data.region.provincial,false);assert.equal(next.data.result.ageDivisor,true);
});

test('梅州办法续期来源和普通九档、延缴边界保持一致，不能按旧文到期误关',()=>{
 for(const tier of [180,240,360,600,900,1200,1800,3600,4800]){const r=resident(form({regionId:'441400',tier}));assert.ok(r.sources.some(x=>x.id==='mz-resident-renewal-2024'));assert.equal(Number(r.chosen.subsidy),(tier<=360?30:60)*9);assert.equal(r.chosen.timeline.lumpAge,65);assert.equal(r.chosen.lumpYears,1);assert.match(r.referenceText,/省最低基础240/);}
 assert.throws(()=>resident(form({regionId:'441400',birth:'1961-10',tier:360})),/延缴/);
 const r=resident(form({regionId:'441400',birth:'1961-10',years:'18',balance:'30000',tier:360}));assert.equal(r.chosen.base,'249.00');
});

test('梅州八县区与潮州三区县按行政范围，已核县区金额不冒充全市已核',()=>{
 const region=require('../miniprogram/resident/data/regions');
 assert.equal(region.getRegion('441400').areas.length,8);assert.equal(region.getRegion('445100').areas.length,3);
 for(const [id,known,unknown]of [['441400',['xingning','meixian'],['meijiang','pingyuan','jiaoling','dabu','fengshun','wuhua']],['445100',['chaoan'],['xiangqiao','raoping']]]){
  for(const area of known){const p=region.getRegion(id,area),r=resident(form({regionId:id,localArea:area,tier:360}));assert.equal(p.provincial,false);assert.equal(p.base,240);assert.equal(r.chosen.base,'240.00');assert.match(r.referenceText,/未核齐/);}
  for(const area of ['',...unknown]){assert.equal(region.getRegion(id,area).provincial,true);assert.match(resident(form({regionId:id,localArea:area,tier:360})).referenceText,/省.*参考|按省最低/);}
  assert.throws(()=>resident(form({regionId:id,localArea:'fake',tier:360})),/有效的参保所在地/);
 }
});

test('惠州采用市级披露最低额，不混入计生特殊待遇或未经发布的草案',()=>{
 const p=registry.capability('441300','resident');assert.equal(p.base,240);assert.equal(p.baseYear,2025);assert.equal(p.provincial,false);assert.ok(p.sources.some(x=>x.id==='hui-resident-base-2025'));
 for(const tier of [180,4800]){const r=resident(form({regionId:'441300',tier}));assert.equal(r.chosen.base,'240.00');assert.match(r.referenceText,/征求意见稿/);assert.match(r.referenceText,/特殊补助/);assert.equal(Number(r.chosen.subsidy),(tier===180?30:60)*9);}
 const pagePolicy=page('pages/policy/policy.js');pagePolicy.onLoad({city:'441300',kind:'resident'});assert.ok(pagePolicy.data.documents.some(x=>x.id==='hui-resident-base-2025'));assert.ok(pagePolicy.data.documents.every(x=>!x.id.startsWith('mz-')&&!x.id.startsWith('cz-')));
});

test('梅州及潮州地区选择重确认资格，结果和地区会话可恢复，切市不沿用',()=>{
 for(const [id,areaIndex,area]of [['441400',1,'xingning'],['441400',2,'meixian'],['445100',1,'chaoan']]){
  const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:id}});p.localArea({detail:{value:areaIndex}});assert.equal(p.data.form.localArea,area);assert.equal(p.data.form.eligible,'unknown');p.setData({'form.eligible':'yes','form.ordinary':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.base,'240.00');p.onHide();const r=page('resident/pages/calc/calc.js',store);assert.equal(r.data.form.localArea,area);assert.equal(r.data.result.regionId,id);r.regionChoice({detail:{regionId:'441300'}});assert.equal(r.data.form.localArea,'');assert.equal(r.data.region.areas,undefined);
 }
 const policy=page('pages/policy/policy.js');policy.onLoad({city:'445100',kind:'resident'});assert.match(policy.data.documents.find(x=>x.id==='cz-chaoan-resident-reference-2026').publisher,/官方账号/);assert.equal(policy.data.documents.find(x=>x.id==='cz-chaoan-resident-reference-2026').date,'资料核对日期：2026-10-19');
});

test('防城港市级最低基础额不是人均实发额，广西本地追溯不改变自治区缴费补贴',()=>{
 const ids=['450600','450700','451300'];
 for(const id of ids)for(const tier of registry.capability(id,'resident').tiers){const r=resident(form({regionId:id,tier}));assert.equal(r.chosen.base,'191.00');assert.equal(Number(r.chosen.subsidy),registry.capability(id,'resident').subsidies[registry.capability(id,'resident').tiers.indexOf(tier)]*10);assert.equal(r.chosen.lumpYears,0);assert.match(r.referenceText,/制度过渡.*未核定时不自动开放/);}
 assert.equal(registry.capability('450600','resident').provincial,false);assert.equal(registry.capability('450700','resident').provincial,false);
 const r=resident(form({regionId:'450600',birth:'1966-10',years:'15',balance:'30000',tier:6000}));assert.equal(r.chosen.base,'186.00');assert.equal(r.chosen.low,(186+30000/139).toFixed(2));assert.equal(r.chosen.total,'0.00');
 const long=resident(form({regionId:'450600',birth:'1961-10',years:'18',balance:'30000',tier:200}));assert.equal(long.chosen.base,'197.00');
 assert.throws(()=>resident(form({regionId:'451300',tier:100})),/当地缴费档次/);
});

test('防城港、来宾、钦州官方来源仅归本市，新增本地参考保留广西历史补缴能力',()=>{
 for(const [city,id]of [['450600','fcg-resident-base-2025-q4'],['451300','lb-resident-tier-local'],['450700','qz-resident-tier-local']]){
  const p=page('pages/policy/policy.js');p.onLoad({city,kind:'resident'});assert.ok(p.data.documents.some(x=>x.id===id&&x.date==='资料核对日期：2026-10-19'));assert.ok(p.data.documents.every(x=>x.cityIds.includes(city)));
  const r=resident(form({regionId:city,pastAnnual:'200',paidThisYear:'no',gxStartYear:'2012',gxScopeReviewed:'yes',tier:200,gxMakeupRows:[{mode:'upgrade',start:'2019',end:'2023',original:'200',target:6000}]}));assert.equal(r.makeup.cost,'29000.00');assert.equal(r.chosen.account,'32350.00');assert.equal(r.chosen.immediateCost,'29000.00');
 }
 const other=page('pages/policy/policy.js');other.onLoad({city:'450100',kind:'resident'});assert.ok(other.data.documents.every(x=>!/^fcg-|^lb-|^qz-/.test(x.id)));
});


test('深圳旧身份确认不能替代本市领取资格，旧会话金额失效，重确认及切换一致',()=>{
 const old=employee({regionId:'440300',currentBase:'5521',szNonLocal:'yes'});
 assert.throws(()=>forecast(old),/深圳实缴累计满10年/);
 assert.throws(()=>forecast({...old,szScopeConfirmed:'unknown'}),/领取地为深圳/);
 assert.equal(forecast({...old,szScopeConfirmed:'yes'}).regionId,'440300');
 for(const [file,key] of [['pages/index/index.js','employee'],['flexible/pages/calc/calc.js','flexible']]){
  const first=page(file);first.regionChanged({detail:{regionId:'440300'}});first.szScope({detail:{value:['yes']}});first.calculate();assert.equal(first.data.error,'');assert.ok(first.data.result);
  const saved=JSON.parse(JSON.stringify(first.data));delete saved.form.szScopeConfirmed;saved.form.szNonLocal='yes';
  const reopened=page(file,{[key]:saved});assert.equal(reopened.data.result,null);reopened.calculate();assert.match(reopened.data.error,/深圳实缴累计满10年/);
  reopened.szScope({detail:{value:['yes']}});reopened.calculate();assert.ok(reopened.data.result);reopened.onHide();
  const restored=page(file,{[key]:JSON.parse(JSON.stringify(reopened.data))});assert.ok(restored.data.result);
  restored.szScope({detail:{value:[]}});restored.calculate();assert.equal(restored.data.result,null);assert.match(restored.data.error,/领取地为深圳/);
  restored.regionChanged({detail:{regionId:'440100'}});restored.regionChanged({detail:{regionId:'440300'}});assert.equal(restored.data.form.szScopeConfirmed,'unknown');
 }
 const sources=registry.city('440300').employee.sources;assert.ok(sources.some(s=>s.id==='sz-scope-2022'&&s.checkedAt==='2026-10-19'));assert.ok(!registry.city('440100').employee.sources.some(s=>s.id==='sz-scope-2022'));
});


test('茂名现行九档及65岁补足、首次领取年龄系数，不使用旧190或新闻400示例',()=>{
 const rule=registry.city('440900').resident;assert.equal(rule.provincial,false);assert.equal(rule.base,240);assert.equal(rule.ageDivisor,true);
 for(const [i,tier] of rule.tiers.entries()){
  const credit=i<3?30:60,s=resident(form({regionId:'440900',birth:'1966-10',years:'5',balance:'30000',tier})).chosen;
  assert.equal(s.timeline.normalYears,4);assert.equal(s.lumpYears,6);assert.equal(s.receiptYear,2031);assert.equal(s.total,String(tier*10)+'.00');assert.equal(s.subsidy,String(credit*4)+'.00');assert.equal(s.account,(30000+tier*10+credit*4).toFixed(2));assert.equal(s.low,(240+(30000+tier*10+credit*4)/101).toFixed(2));
 }
 for(const [birth,divisor] of [['1966-10',139],['1961-10',101],['1956-10',56]]){
  const s=resident(form({regionId:'440900',birth,years:'18',balance:'30000',tier:360})).chosen;
  assert.equal(s.total,'0.00');assert.equal(s.base,'249.00');assert.equal(s.low,(249+30000/divisor).toFixed(2));
 }
 const birthday=resident(form({regionId:'440900',birth:'1961-11',years:'15',balance:'30000',tier:360})).chosen;assert.equal(birthday.timeline.receivingAge,65);assert.equal(birthday.low,(240+30000/101).toFixed(2));
 assert.throws(()=>resident(form({regionId:'440900',birth:'1955-11',years:'15',balance:'30000',tier:360})),/超过70岁/);
 assert.throws(()=>resident(form({regionId:'440900',birth:'1961-10',years:'5',tier:360})),/延缴/);
 assert.throws(()=>resident(form({regionId:'440900',tier:120})),/档次/);
});
test('肇庆九档下限与65岁普通补足，本地资料不串到揭阳或职工',()=>{
 const p=registry.city('441200').resident;assert.equal(p.base,240);assert.equal(p.provincial,false);
 for(const [i,tier]of p.tiers.entries()){
  const s=resident(form({regionId:'441200',birth:'1966-10',years:'5',balance:'30000',tier})).chosen;
  assert.equal(Number(s.total),tier*10);assert.equal(Number(s.subsidy),(i<3?30:60)*4);assert.equal(s.lumpYears,6);assert.equal(s.low,(240+Number(s.account)/139).toFixed(2));
 }
 assert.equal(resident(form({regionId:'441200',birth:'1966-10',years:'18',balance:'30000',tier:360})).chosen.base,'249.00');
 const ids={440900:['mm-resident-rule-2020','mm-resident-renewal-2025','mm-resident-ordinary-divisor','mm-resident-base-2025'],441200:['zq-resident-rule-2020','zq-resident-base-2025','zq-resident-makeup-channel-2026']};
 for(const [city,expected]of Object.entries(ids)){
  const pagePolicy=page('pages/policy/policy.js');pagePolicy.onLoad({city,kind:'resident'});
  for(const id of expected){const d=pagePolicy.data.documents.find(d=>d.id===id);assert.ok(d);assert.deepEqual(d.cityIds,[city]);assert.match(d.date,/2026-10-19/);}
  for(const other of registry.cities.filter(c=>c.id!==city))for(const id of expected){assert.ok(!other.resident.sources.some(s=>s.id===id));assert.ok(!other.employee.sources.some(s=>s.id===id));}
 }
 assert.match(registry.city('445200').resident.referenceLabel,/省级/);
});


test('玉林本地长缴4元不套自治区2元，领取年龄加发及历史年数独立计算',()=>{
 const p=registry.city('450900').resident;assert.equal(p.extraYear,4);assert.equal(p.provincial,true);assert.match(p.referenceLabel,/基础额按广西标准/);
 for(const years of [15,16,20,25])for(const [birth,base]of [['1966-10',186],['1961-10',191]]){
  const f=form({regionId:'450900',birth,years:String(years),tier:6000,balance:'30000'}),s=resident(f).chosen;
  const expected=base+(years-15)*4;assert.equal(Number(s.base),expected);assert.equal(s.total,'0.00');assert.equal(s.low,(expected+30000/139).toFixed(2));
  const other=resident({...f,regionId:'450600'}).chosen;assert.equal(Number(s.base)-Number(other.base),(years-15)*2);
 }
 const r=resident(form({regionId:'450900',birth:'1966-10',years:'15',pastAnnual:'200',tier:200,gxStartYear:'2010',gxScopeReviewed:'yes',gxMakeupRows:[{mode:'missing',start:'2010',end:'2010',target:1000}]}));
 assert.equal(r.makeup.addedYears,1);assert.equal(r.chosen.immediateCost,'1000.00');assert.equal(r.chosen.total,'1000.00');assert.equal(r.chosen.subsidy,'0.00');assert.equal(r.chosen.base,'190.00');assert.equal(r.chosen.account,'4000.00');
});
test('柳州本地15档原件与自治区参数一致，历史提档不冒充60岁过渡补足',()=>{
 const p=registry.city('450200').resident;assert.equal(p.provincial,true);assert.equal(p.extraYear,2);assert.ok(!p.lumpAt60);assert.ok(!p.lumpAt65);
 for(const [i,tier]of p.tiers.entries()){
  const r=resident(form({regionId:'450200',pastAnnual:'200',tier,paidThisYear:'no',gxStartYear:'2012',gxScopeReviewed:'yes',gxMakeupRows:[{mode:'upgrade',start:'2019',end:'2023',original:200,target:6000}]}));
  assert.equal(r.makeup.cost,'29000.00');assert.equal(r.chosen.total,(29000+tier*10).toFixed(2));assert.equal(r.chosen.subsidy,(p.subsidies[i]*10).toFixed(2));assert.equal(r.chosen.lumpYears,0);assert.equal(r.chosen.account,(30000+tier*10+p.subsidies[i]*10).toFixed(2));
 }
 for(const [city,ids]of [['450900',['yl-resident-tenure-2024','yl-resident-official-calculator-2026']],['450200',['lz-resident-handbook-2025']]]){
  const policyPage=page('pages/policy/policy.js');policyPage.onLoad({city,kind:'resident'});
  for(const id of ids){const d=policyPage.data.documents.find(x=>x.id===id);assert.ok(d);assert.deepEqual(d.cityIds,[city]);assert.match(d.date,/2026-10-19/);for(const other of registry.cities.filter(c=>c.id!==city)){assert.ok(!other.resident.sources.some(s=>s.id===id));assert.ok(!other.employee.sources.some(s=>s.id===id));}}
 }
});


test('广西旧补缴确认会话失效，新资格确认可恢复，切市或改补缴需重确认',()=>{
 const first=page('resident/pages/calc/calc.js');first.regionChoice({detail:{regionId:'450500'}});
 first.setData({'form.eligible':'yes','form.ordinary':'yes','form.pastAnnual':'200','form.paidThisYear':'no','form.gxStartYear':'2012','form.gxScopeReviewed':'yes','form.gxMakeupRows':[{mode:'upgrade',start:'2019',end:'2023',original:200,target:6000}]});first.calculate();assert.equal(first.data.error,'');assert.ok(first.data.result);
 const old=JSON.parse(JSON.stringify(first.data));delete old.form.gxScopeReviewed;old.form.gxReviewed='yes';
 const p=page('resident/pages/calc/calc.js',{resident:old});assert.equal(p.data.result,null);assert.equal(p.data.display,null);assert.equal(p.data.baseline,null);assert.deepEqual(Array.from(p.data.planOptions),[]);p.calculate();assert.match(p.data.error,/尚未领取/);
 p.choice({currentTarget:{dataset:{key:'gxScopeReviewed',value:'yes'}}});p.calculate();assert.equal(p.data.error,'');assert.ok(p.data.result);const restored=page('resident/pages/calc/calc.js',{resident:JSON.parse(JSON.stringify(p.data))});assert.ok(restored.data.result);
 restored.gxInput({currentTarget:{dataset:{index:0,key:'original'}},detail:{value:'300'}});assert.equal(restored.data.form.gxScopeReviewed,'unknown');
 restored.regionChoice({detail:{regionId:'451100'}});assert.equal(restored.data.form.gxScopeReviewed,'unknown');assert.equal(restored.data.form.gxMakeupRows.length,0);
 const ordinary=page('resident/pages/calc/calc.js');ordinary.calculate();assert.ok(ordinary.data.result);assert.ok(page('resident/pages/calc/calc.js',{resident:JSON.parse(JSON.stringify(ordinary.data))}).data.result);
});
test('北海贺州原件仅归本市，15档历史提档与未来正常补贴不混',()=>{
 for(const [city,id]of [['450500','bh-resident-makeup-local-2023'],['451100','hezhou-resident-makeup-interpretation']]){
  const p=registry.city(city).resident;assert.equal(p.provincial,true);assert.ok(!p.lumpAt60);
  for(const [i,tier]of p.tiers.entries()){
   const r=resident(form({regionId:city,tier,pastAnnual:'200',paidThisYear:'no',gxStartYear:'2012',gxScopeReviewed:'yes',gxMakeupRows:[{mode:'upgrade',start:'2019',end:'2023',original:200,target:6000}]}));assert.equal(r.makeup.cost,'29000.00');assert.equal(r.chosen.subsidy,(p.subsidies[i]*10).toFixed(2));assert.equal(r.chosen.total,(29000+tier*10).toFixed(2));
  }
  const policy=page('pages/policy/policy.js');policy.onLoad({city,kind:'resident'});const d=policy.data.documents.find(x=>x.id===id);assert.ok(d);assert.deepEqual(d.cityIds,[city]);assert.match(d.date,/2026-10-19/);for(const other of registry.cities.filter(x=>x.id!==city))assert.ok(!other.resident.sources.some(x=>x.id===id));
 }
});


test('云浮页面交够后续缴可在填写与结果切换，保留历史及会话，换市归默认',()=>{
 const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:'445300'}});
 p.setData({'form.ageOnly':false,'form.birth':'1971-10','form.asOf':'2026-10','form.years':'15','form.accountMode':'balance','form.balance':'30000','form.pastAnnual':'360','form.paidThisYear':'yes','form.ordinary':'yes','form.eligible':'yes','form.tier':360});p.refreshPolicyQuestions();assert.equal(p.data.canContinueTo60,true);assert.equal(p.data.payUntilIndex,0);
 p.calculate();assert.equal(p.data.error,'');const original=p.data.result.chosen.low;assert.equal(p.data.result.chosen.total,'0.00');p.payUntil({detail:{value:1}});assert.equal(p.data.form.payUntil,'SIXTY');assert.equal(p.data.payUntilIndex,1);assert.equal(p.data.result.chosen.total,'1440.00');assert.equal(p.data.baseline.low,original);assert.equal(p.data.compare,true);assert.equal(p.data.form.balance,'30000');
 p.chooseFuture({currentTarget:{dataset:{annual:600}}});assert.equal(p.data.result.chosen.total,'2400.00');assert.equal(p.data.result.chosen.subsidy,'440.00');p.onHide();
 const restored=page('resident/pages/calc/calc.js',store);assert.equal(restored.data.result.chosen.annual,600);assert.equal(restored.data.form.payUntil,'SIXTY');assert.equal(restored.data.payUntilIndex,1);assert.equal(restored.data.baseline.low,original);
 restored.payUntil({detail:{value:0}});assert.equal(restored.data.result.chosen.total,'0.00');assert.equal(restored.data.payUntilIndex,0);restored.edit();restored.payUntil({detail:{value:1}});assert.equal(restored.data.result,null);assert.equal(restored.data.form.payUntil,'SIXTY');restored.calculate();assert.ok(restored.data.result);
 restored.regionChoice({detail:{regionId:'450900'}});assert.equal(restored.data.form.payUntil,'MINIMUM');assert.equal(restored.data.canContinueTo60,true);assert.equal(restored.data.result,null);
 restored.regionChoice({detail:{regionId:'445300'}});restored.setData({'form.ageOnly':true,'form.age':'60'});restored.refreshPolicyQuestions();assert.equal(restored.data.canContinueTo60,false);assert.equal(restored.data.form.payUntil,'MINIMUM');
});

test('江门续缴页面换档与恢复保持本市补贴，政策出处不串其他城市',()=>{
 const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:'440700'}});
 p.setData({'form.ageOnly':false,'form.birth':'1971-10','form.asOf':'2026-10','form.years':'15','form.accountMode':'balance','form.balance':'30000','form.pastAnnual':'360','form.paidThisYear':'yes','form.ordinary':'yes','form.eligible':'yes','form.tier':360});p.refreshPolicyQuestions();assert.equal(p.data.canContinueTo60,true);p.calculate();assert.equal(p.data.error,'');const original=p.data.result.chosen.low;
 p.payUntil({detail:{value:1}});assert.equal(p.data.result.chosen.total,'1440.00');assert.equal(p.data.result.chosen.subsidy,'120.00');assert.equal(p.data.result.chosen.base,'254.50');assert.equal(p.data.baseline.low,original);
 p.chooseFuture({currentTarget:{dataset:{annual:600}}});assert.equal(p.data.result.chosen.total,'2400.00');assert.equal(p.data.result.chosen.subsidy,'240.00');p.onHide();const restored=page('resident/pages/calc/calc.js',store);assert.equal(restored.data.form.payUntil,'SIXTY');assert.equal(restored.data.result.chosen.annual,600);assert.equal(restored.data.form.balance,'30000');
 restored.regionChoice({detail:{regionId:'445300'}});assert.equal(restored.data.form.payUntil,'MINIMUM');assert.equal(restored.data.result,null);
 const policy=page('pages/policy/policy.js');policy.onLoad({city:'440700',kind:'resident'});const d=policy.data.documents.find(x=>x.id==='jm-resident-continue-2025');assert.ok(d);assert.deepEqual(d.cityIds,['440700']);assert.equal(d.date,'资料核对日期：2026-10-19');for(const other of registry.cities.filter(x=>x.id!=='440700'))assert.ok(!other.resident.sources.some(s=>s.id===d.id));
});

test('百色居民领取年龄和年限不套职工改革或按性别延迟',()=>{
 const p=registry.city('451000').resident;assert.equal(p.provincial,true);assert.equal(p.baseYear,2025);assert.equal(p.base,186);
 for(const sex of ['male','female']){
  const r=resident(form({regionId:'451000',birth:'1966-12',years:'15',balance:'30000',tier:200,sex})).chosen;
  assert.equal(r.timeline.receivingAge,60);assert.equal(r.receiptYear,2027);assert.equal(r.total,'0.00');assert.equal(r.base,'186.00');assert.equal(r.low,(186+30000/139).toFixed(2));
 }
 const short=resident(form({regionId:'451000',birth:'1966-10',years:'14',tier:200})).chosen;assert.equal(short.timeline.normalYears,1);assert.equal(short.receiptYear,2027);assert.equal(short.lumpYears,0);
});

test('崇左起领取条件齐备的次月，年末达到年龄或缴费均跨到次年',()=>{
 const f=form({regionId:'451400',birth:'1966-12',asOf:'2026-10',years:'15',tier:200}),r=resident(f).chosen;
 assert.equal(r.receiptYear,2027);assert.equal(r.timeline.receivingAge,60);assert.equal(r.timeline.normalYears,0);
 const later=resident({...f,birth:'1965-10',asOf:'2026-12',years:'14',paidThisYear:'no'}).chosen;assert.equal(later.timeline.normalYears,1);assert.equal(later.timeline.lastYear,2026);assert.equal(later.receiptYear,2027);assert.equal(later.timeline.receivingAge,61);
 assert.equal(registry.city('451400').resident.provincial,true);
});

test('桂林城区旧办法不倒套现行15档和补贴，也不自动开放全市特殊补足',()=>{
 const p=registry.city('450300').resident;assert.equal(p.provincial,true);assert.equal(p.tiers.length,15);assert.equal(p.tiers[0],200);assert.equal(p.subsidies[0],35);assert.ok(!p.lumpAt60);assert.equal(p.continueTo60,true);assert.ok(p.sources.some(s=>s.id==='gx-resident-incentive-2018'));
 for(const [i,tier]of p.tiers.entries()){
  const s=resident(form({regionId:'450300',birth:'1971-10',years:'5',pastAnnual:'200',tier})).chosen;assert.equal(s.timeline.normalYears,10);assert.equal(s.subsidy,(p.subsidies[i]*10).toFixed(2));assert.equal(s.total,(tier*10).toFixed(2));assert.equal(s.base,'191.00');assert.equal(s.account,(1000+(tier+p.subsidies[i])*10).toFixed(2));
 }
 assert.throws(()=>resident(form({regionId:'450300',tier:100})),/当地缴费档/);
});

test('桂林城区、百色和崇左来源按市隔离，历史文件用途和未核金额保留可见',()=>{
 for(const [id,source]of [['450300','gl-resident-urban-rule-2014'],['451000','bs-resident-age-2024'],['451400','chongzuo-resident-receipt-month']]){
  const p=registry.city(id).resident;assert.match(p.referenceText,/自治区参考/);const policy=page('pages/policy/policy.js');policy.onLoad({city:id,kind:'resident'});const d=policy.data.documents.find(x=>x.id===source);assert.ok(d);assert.deepEqual(d.cityIds,[id]);assert.match(d.date,/2026-10-19/);
  for(const c of registry.cities){assert.ok(!c.employee.sources.some(x=>x.id===source));if(c.id!==id)assert.ok(!c.resident.sources.some(x=>x.id===source));}
 }
 assert.match(registry.city('450300').resident.sources.find(x=>x.id==='gl-resident-urban-rule-2014').text,/不把城区历史起点套给桂林所有县市/);
});

test('广东灵活页面单位年限归零时纠正原50岁并清旧结果，再填单位记录可重新选',()=>{
 const p=page('flexible/pages/calc/calc.js');p.setData({'form.birthMonth':'1985-06','form.firstInsuredMonth':'2010-07','form.dataAsOf':'2026-10','form.unitYears':10,'form.unitMonths':0,'form.flexYears':2,'form.flexMonths':0});p.refresh();p.category({detail:{value:2}});p.calculate();assert.equal(p.data.error,'');assert.ok(p.data.result);assert.equal(p.data.form.category,'FEMALE_50');
 p.input({currentTarget:{dataset:{key:'unitYears'}},detail:{value:'0'}});assert.equal(p.data.form.category,'FEMALE_55');assert.equal(p.data.result,null);assert.equal(p.data.categoryLabels.length,2);assert.match(p.data.error,/重新计算/);p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.retirement.month,'2043-06');
 p.edit();p.input({currentTarget:{dataset:{key:'unitMonths'}},detail:{value:'1'}});assert.equal(p.data.categoryLabels.length,3);p.category({detail:{value:2}});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.retirement.month,'2040-06');
});

test('广西灵活旧原50岁结果恢复失效，原55岁结果可恢复，换广东不混类别索引',()=>{
 const store={},p=page('flexible/pages/calc/calc.js',store);p.regionChanged({detail:{regionId:'450100'}});p.setData({'form.birthMonth':'1985-06','form.firstInsuredMonth':'2010-07','form.dataAsOf':'2026-10','form.unitYears':10,'form.unitMonths':0,'form.flexYears':2,'form.flexMonths':0,'form.category':'FEMALE_50',categoryIndex:2,result:{old:true}});p.onHide();
 const q=page('flexible/pages/calc/calc.js',store);assert.equal(q.data.result,null);assert.equal(q.data.form.category,'FEMALE_55');assert.equal(q.data.categoryIndex,1);assert.equal(q.data.categoryLabels.length,2);assert.match(q.data.error,/重新计算/);q.calculate();assert.equal(q.data.error,'');assert.equal(q.data.result.retirement.month,'2043-06');q.onHide();
 const restored=page('flexible/pages/calc/calc.js',store);assert.ok(restored.data.result);assert.equal(restored.data.form.category,'FEMALE_55');restored.regionChanged({detail:{regionId:'440700'}});assert.equal(restored.data.result,null);assert.equal(restored.data.categoryLabels.length,3);restored.category({detail:{value:2}});restored.calculate();assert.equal(restored.data.error,'');assert.equal(restored.data.result.retirement.month,'2040-06');
});


test('南宁居民页面选兴宁区才使用本地额，切回省参考清旧结果且不误认广东兴宁市',()=>{
 const p=page('resident/pages/calc/calc.js');p.setData({'form.makeupStrategy':'ANNUAL_ONLY'});p.regionChoice({detail:{regionId:'450100'}});assert.equal(p.data.region.base,186);assert.equal(p.data.areaLabels[1],'兴宁区');
 p.localArea({detail:{value:1}});assert.equal(p.data.form.localArea,'xingning');assert.equal(p.data.region.base,211);assert.equal(p.data.form.eligible,'unknown');assert.equal(p.data.form.ordinary,'unknown');
 p.setData({'form.eligible':'yes','form.ordinary':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.region,'南宁市 · 兴宁区');assert.equal(p.data.result.chosen.base,'226.00');
 p.localArea({detail:{value:0}});assert.equal(p.data.result,null);assert.equal(p.data.baseline,null);assert.equal(p.data.form.localArea,'');assert.equal(p.data.region.base,186);
 p.localArea({detail:{value:1}});p.regionChoice({detail:{regionId:'441400'}});assert.equal(p.data.form.localArea,'');assert.equal(p.data.region.tenureBonus,undefined);assert.equal(p.data.region.base,240);
});


test('南宁区县切换：兴宁完整额与青秀自治区底额及长缴规则不残留',()=>{
 const p=page('resident/pages/calc/calc.js');p.regionChoice({detail:{regionId:'450100'}});assert.match(p.data.areaLabels[2],/青秀区/);
 p.localArea({detail:{value:1}});p.setData({'form.eligible':'yes','form.ordinary':'yes','form.years':'20'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.base,'231.00');
 p.localArea({detail:{value:2}});assert.equal(p.data.result,null);assert.equal(p.data.baseline,null);assert.equal(p.data.region.base,186);assert.equal(p.data.region.tenureBonus,undefined);assert.equal(p.data.region.extraYear,4);
 p.setData({'form.eligible':'yes','form.ordinary':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.base,'206.00');assert.match(p.data.result.referenceLabel,/基础额按广西标准/);
 p.localArea({detail:{value:1}});assert.equal(p.data.result,null);assert.equal(p.data.region.base,211);assert.equal(p.data.region.extraYear,2);assert.equal(p.data.region.tenureBonus.amount,10);
});

test('广西补断缴后表单与引擎按同一年限开放续缴，改记录清资格和方案，恢复不丢结果',()=>{
 const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:'450100'}});
 p.setData({'form.ageOnly':false,'form.birth':'1971-10','form.asOf':'2026-10','form.years':'5','form.accountMode':'balance','form.balance':'1800','form.paidThisYear':'yes','form.ordinary':'yes','form.eligible':'yes','form.tier':200});p.refreshPolicyQuestions();assert.equal(p.data.canContinueTo60,false);
 p.gxAdd();p.setData({'form.gxStartYear':'2012','form.gxMakeupRows':[{mode:'missing',start:'2012',end:'2018',target:200}],'form.gxScopeReviewed':'yes'});p.refreshPolicyQuestions();assert.equal(p.data.canContinueTo60,true);p.calculate();assert.equal(p.data.error,'');const before=p.data.result.chosen.low;
 p.payUntil({detail:{value:1}});assert.equal(p.data.form.payUntil,'SIXTY');assert.equal(p.data.result.chosen.total,'2200.00');assert.equal(p.data.result.chosen.timeline.finalYears,16);assert.equal(p.data.result.chosen.subsidy,'140.00');assert.equal(p.data.baseline.low,before);p.onHide();
 const restored=page('resident/pages/calc/calc.js',store);assert.equal(restored.data.result.chosen.total,'2200.00');assert.equal(restored.data.canContinueTo60,true);assert.equal(restored.data.form.payUntil,'SIXTY');
 restored.gxInput({currentTarget:{dataset:{index:0,key:'end'}},detail:{value:'2017'}});assert.equal(restored.data.result,null);assert.equal(restored.data.form.gxScopeReviewed,'unknown');assert.equal(restored.data.canContinueTo60,false);assert.equal(restored.data.form.payUntil,'MINIMUM');
 restored.gxRemove({currentTarget:{dataset:{index:0}}});assert.equal(restored.data.canContinueTo60,false);assert.equal(restored.data.form.gxMakeupRows.length,0);
});


test('深圳旧指数缓存回到填写页，两入口保留新指数结果且保留原输入',()=>{
 for(const [file,key]of [['pages/index/index.js','employee'],['flexible/pages/calc/calc.js','flexible']]){
  const p=page(file);p.regionChanged({detail:{regionId:'440300'}});p.szScope({detail:{value:['yes']}});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.indexWage,9201);
  const saved=JSON.parse(JSON.stringify(p.data)),old=JSON.parse(JSON.stringify(saved));delete old.result.indexWage;
  const restored=page(file,{[key]:old});assert.equal(restored.data.result,null);assert.match(restored.data.error,/重新计算.*当前参数/);assert.equal(restored.data.form.birthMonth,saved.form.birthMonth);assert.equal(restored.data.form.szScopeConfirmed,'yes');
  const current=page(file,{[key]:saved});assert.ok(current.data.result);assert.equal(current.data.result.indexWage,9201);
  const wrong=JSON.parse(JSON.stringify(saved));wrong.result.indexWage=9493;assert.equal(page(file,{[key]:wrong}).data.result,null);
 }
});


test('湛江复用今年实际档控件，九档可选，换市清空且恢复不丢',()=>{
 const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:'440800'}});p.choice({currentTarget:{dataset:{key:'paidThisYear',value:'no'}}});assert.equal(p.data.needsCurrentYearTier,true);
 p.currentYearTier({detail:{value:3}});p.setData({'form.eligible':'yes','form.ordinary':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.timeline.lockedAnnual,360);p.onHide();assert.equal(page('resident/pages/calc/calc.js',store).data.form.currentYearTier,360);
 p.regionChoice({detail:{regionId:'450700'}});assert.equal(p.data.form.currentYearTier,0);assert.equal(p.data.needsCurrentYearTier,false);
});


test('广西核定补足入口按60岁条件显示，确认后两档比较和会话保留',()=>{
 const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:'450700'}});p.setData({'form.paidThisYear':'no'});assert.equal(p.data.canGXTransition,false);
 p.input({currentTarget:{dataset:{key:'age'}},detail:{value:'60'}});assert.equal(p.data.canGXTransition,true);
 p.ageMode({currentTarget:{dataset:{value:'birth'}}});p.input({currentTarget:{dataset:{key:'birth'}},detail:{value:'1964-10'}});p.input({currentTarget:{dataset:{key:'years'}},detail:{value:'13'}});p.input({currentTarget:{dataset:{key:'gxTransitionStart'}},detail:{value:'2012-01'}});p.choice({currentTarget:{dataset:{key:'gxTransitionEnabled',value:'yes'}}});p.input({currentTarget:{dataset:{key:'gxTransitionYears'}},detail:{value:'2'}});p.setData({'form.eligible':'yes'});p.calculate();assert.match(p.data.error,/经办核定/);assert.equal(p.data.result,null);
 p.choice({currentTarget:{dataset:{key:'gxTransitionReviewed',value:'yes'}}});assert.equal(p.data.cdLumpOnly,true);p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.lumpYears,2);assert.equal(p.data.result.chosen.subsidy,'70.00');assert.equal(p.data.result.chosen.timeline.normalYears,0);
 p.chooseFuture({currentTarget:{dataset:{annual:6000}}});assert.equal(p.data.result.chosen.total,'12000.00');assert.equal(p.data.result.chosen.subsidy,'400.00');p.input({currentTarget:{dataset:{key:'budget'}},detail:{value:'11000'}});assert.equal(p.data.form.gxTransitionReviewed,'yes');p.calculate();assert.equal(p.data.result.chosen.affordable,false);assert.equal(p.data.result.chosen.shortfall,'1000.00');p.onHide();const restored=page('resident/pages/calc/calc.js',store);assert.ok(restored.data.result.transition);assert.equal(restored.data.result.chosen.annual,6000);assert.equal(restored.data.form.gxTransitionReviewed,'yes');
});

test('广西核定信息改动撤销确认，变回未满60岁或换市时关闭入口',()=>{
 const p=page('resident/pages/calc/calc.js');p.regionChoice({detail:{regionId:'450700'}});p.setData({'form.paidThisYear':'no'});p.input({currentTarget:{dataset:{key:'age'}},detail:{value:'60'}});p.ageMode({currentTarget:{dataset:{value:'birth'}}});p.input({currentTarget:{dataset:{key:'birth'}},detail:{value:'1964-10'}});p.input({currentTarget:{dataset:{key:'years'}},detail:{value:'13'}});p.input({currentTarget:{dataset:{key:'gxTransitionStart'}},detail:{value:'2012-01'}});p.choice({currentTarget:{dataset:{key:'gxTransitionEnabled',value:'yes'}}});p.input({currentTarget:{dataset:{key:'gxTransitionYears'}},detail:{value:'2'}});p.choice({currentTarget:{dataset:{key:'gxTransitionReviewed',value:'yes'}}});
 p.input({currentTarget:{dataset:{key:'years'}},detail:{value:'6'}});assert.equal(p.data.form.gxTransitionReviewed,'unknown');p.setData({'form.gxTransitionReviewed':'yes','form.age':'59'});p.ageMode({currentTarget:{dataset:{value:'age'}}});assert.equal(p.data.form.gxTransitionEnabled,'no');assert.equal(p.data.form.gxTransitionReviewed,'unknown');
 p.regionChoice({detail:{regionId:'450100'}});assert.equal(p.data.form.gxTransitionEnabled,'no');assert.equal(p.data.form.gxTransitionYears,'');assert.equal(p.data.form.gxTransitionReviewed,'unknown');
});

test('广西未核定补足的旧缓存结果清除，不把核定按钮自动勾选',()=>{
 const p=page('resident/pages/calc/calc.js');p.regionChoice({detail:{regionId:'450700'}});p.setData({'form.paidThisYear':'no'});p.setData({'form.age':'60','form.ageOnly':false,'form.birth':'1964-10','form.years':'13','form.gxTransitionStart':'2012-01','form.eligible':'yes','form.gxTransitionEnabled':'yes','form.gxTransitionYears':'2','form.gxTransitionReviewed':'yes'});p.refreshPolicyQuestions();p.calculate();assert.ok(p.data.result.transition);
 const saved=JSON.parse(JSON.stringify(p.data));delete saved.form.gxTransitionReviewed;const restored=page('resident/pages/calc/calc.js',{resident:saved});assert.equal(restored.data.result,null);assert.equal(restored.data.baseline,null);assert.equal(restored.data.display,null);restored.calculate();assert.match(restored.data.error,/核定/);
});


test('柳州选融水才显示本县标准，原制度年月不猜填，保存恢复与切回省参考一致',()=>{
 const store={},p=page('resident/pages/calc/calc.js',store);p.regionChoice({detail:{regionId:'450200'}});assert.equal(p.data.region.provincial,true);assert.match(p.data.areaLabels[1],/融水/);
 p.localArea({detail:{value:1}});assert.equal(p.data.region.provincial,false);assert.equal(p.data.form.gxTransitionStart,'');p.setData({'form.eligible':'yes','form.ordinary':'yes'});p.calculate();assert.equal(p.data.error,'');assert.match(p.data.result.region,/融水/);assert.match(p.data.result.referenceLabel,/本地最低/);p.onHide();const restored=page('resident/pages/calc/calc.js',store);assert.ok(restored.data.result);assert.equal(restored.data.form.localArea,'rongshui');assert.equal(restored.data.areaIndex,1);
 restored.localArea({detail:{value:0}});assert.equal(restored.data.result,null);assert.equal(restored.data.region.provincial,true);assert.equal(restored.data.form.localArea,'');assert.equal(restored.data.form.eligible,'unknown');
});


test('深圳旧居民结果按次月加发规则清缓存，新结果仍恢复，不影响其他城市缓存',()=>{
 const p=page('resident/pages/calc/calc.js');p.regionChoice({detail:{regionId:'440300'}});p.setData({'form.eligible':'yes','form.ordinary':'yes'});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.ageExtraNextMonth,true);
 const saved=JSON.parse(JSON.stringify(p.data)),old=JSON.parse(JSON.stringify(saved));delete old.result.ageExtraNextMonth;
 const stale=page('resident/pages/calc/calc.js',{resident:old});assert.equal(stale.data.result,null);assert.equal(stale.data.baseline,null);assert.equal(stale.data.display,null);assert.match(stale.data.error,/加发规则已更新/);assert.equal(stale.data.form.birth,saved.form.birth);
 const current=page('resident/pages/calc/calc.js',{resident:saved});assert.ok(current.data.result);assert.equal(current.data.result.ageExtraNextMonth,true);
 p.regionChoice({detail:{regionId:'450700'}});p.setData({'form.eligible':'yes','form.ordinary':'yes'});p.calculate();const gx=JSON.parse(JSON.stringify(p.data));delete gx.result.ageExtraNextMonth;assert.ok(page('resident/pages/calc/calc.js',{resident:gx}).data.result);
});


test('广东省模型两入口清除旧9493指数缓存，新结果及已填信息能恢复',()=>{
 for(const c of registry.cities.filter(c=>c.employee.rule==='GUANGDONG'||c.id==='440100'))for(const [file,key]of [['pages/index/index.js','employee'],['flexible/pages/calc/calc.js','flexible']]){
  const p=page(file);p.regionChanged({detail:{regionId:c.id}});p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.indexWage,9201);
  const saved=JSON.parse(JSON.stringify(p.data)),old=JSON.parse(JSON.stringify(saved));old.result.indexWage=9493;old.compare=true;
  const restored=page(file,{[key]:old});assert.equal(restored.data.result,null);assert.equal(restored.data.compare,false);assert.match(restored.data.error,/重新计算.*当前参数/);assert.equal(restored.data.form.birthMonth,saved.form.birthMonth);assert.equal(restored.data.form.regionId,c.id);assert.equal(restored.data.form.principal,saved.form.principal);
  const current=page(file,{[key]:saved});assert.ok(current.data.result);assert.equal(current.data.result.indexWage,9201);assert.equal(current.data.result.scenarios[0].totalLow,saved.result.scenarios[0].totalLow);
 }
});


test('广西原制度范围更新清除旧核定金额，保留输入，新范围结果能恢复',()=>{
 const p=page('resident/pages/calc/calc.js');p.regionChoice({detail:{regionId:'450700'}});p.setData({'form.ageOnly':false,'form.birth':'1964-10','form.years':'13','form.paidThisYear':'no','form.gxTransitionStart':'2012-01','form.eligible':'yes','form.gxTransitionEnabled':'yes','form.gxTransitionYears':'2','form.gxTransitionReviewed':'yes'});p.refreshPolicyQuestions();p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.transition.coverageYear,2012);
 const saved=JSON.parse(JSON.stringify(p.data)),old=JSON.parse(JSON.stringify(saved));delete old.result.transition.coverageYear;old.result.transition.schemeStart='2014-01';old.form.gxTransitionStart='2014-01';old.compare=true;
 const restored=page('resident/pages/calc/calc.js',{resident:old});assert.equal(restored.data.result,null);assert.equal(restored.data.baseline,null);assert.equal(restored.data.display,null);assert.equal(restored.data.compare,false);assert.match(restored.data.error,/日期范围已核实/);assert.equal(restored.data.form.gxTransitionStart,'2014-01');assert.equal(restored.data.form.birth,'1964-10');restored.calculate();assert.match(restored.data.error,/2012年已实现/);
 const valid=page('resident/pages/calc/calc.js',{resident:saved});assert.ok(valid.data.result);assert.equal(valid.data.result.chosen.total,saved.result.chosen.total);assert.equal(valid.data.form.gxTransitionReviewed,'yes');
});
