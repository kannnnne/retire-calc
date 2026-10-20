const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const experience=require('../miniprogram/resident/utils/payment-experience');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const {getRegion}=require('../miniprogram/resident/data/regions');
function browser(){const sessions={};return (relative='resident/pages/calc/calc.js')=>{let def;const file=path.join(__dirname,'../miniprogram',relative),base=path.dirname(file);vm.runInNewContext(fs.readFileSync(file,'utf8'),{Date,JSON,wx:{pageScrollTo(){},showModal(){}},Page:x=>def=x,require:x=>x.endsWith('/session')?{load:k=>sessions[k]?JSON.parse(JSON.stringify(sessions[k])):null,save:(k,v)=>{sessions[k]=JSON.parse(JSON.stringify(v));}}:require(path.resolve(base,x))});const p={...def,data:JSON.parse(JSON.stringify(def.data)),setData(patch){for(const[k,v]of Object.entries(patch)){const keys=k.split('.');let t=this.data;for(const key of keys.slice(0,-1))t=t[key];t[keys.at(-1)]=v;}}};p.onLoad();return p;};}
function guiping(open=browser()){const p=open();p.regionChoice({detail:{regionId:'450800'}});p.localArea({detail:{value:1}});p.setData({'form.age':'59','form.years':'5','form.pastAnnual':'360','form.tier':200,'form.asOf':'2026-10'});return p;}

test('桂平基本事实可以直接算，不要求用户给自己选择政策类别或假装已获核定',()=>{
 const p=guiping();assert.equal(p.data.form.ordinary,'unknown');assert.equal(p.data.form.eligible,'unknown');p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.timeline.receivingAge,69);assert.equal(p.data.result.projectionScope,'PRE_RECEIPT_REFERENCE');
 assert.equal(p.data.form.ordinary,'unknown');assert.equal(p.data.form.eligible,'unknown');assert.equal(p.data.form.gxScopeReviewed,'unknown');assert.equal(p.data.form.gxTransitionReviewed,'unknown');
 p.edit();p.choice({currentTarget:{dataset:{key:'receiving',value:'yes'}}});p.calculate();assert.equal(p.data.result,null);assert.match(p.data.error,/已经在领取/);
});
test('不记得首次年份也有明确假设的费用示例，不捏造记录或替用户确认可补',()=>{
 const p=guiping();p.calculate();const original=JSON.stringify(p.data.form),monthly=p.data.display.monthly;p.openPaymentPlanner();
 assert.equal(p.data.planning,true);assert.equal(p.data.gxPlan.years.length,0);assert.equal(p.data.form.firstPaidYear,'');
 assert.equal(p.data.planIllustration.years,10);assert.equal(p.data.planIllustration.cost,'2000');assert.equal(p.data.planIllustration.age,60);assert.equal(p.data.planIllustration.monthly,'210');assert.match(p.data.planIllustration.note,/不代表已经符合/);
 assert.equal(p.data.planReturn.result.chosen.timeline.receivingAge,69);assert.equal(p.data.form.gxMakeupRows.length,0);assert.equal(p.data.form.gxScopeReviewed,'unknown');
 p.cancelPaymentPlanner();assert.equal(JSON.stringify(p.data.form),original);assert.equal(p.data.display.monthly,monthly);assert.equal(p.data.result.chosen.timeline.receivingAge,69);assert.equal(p.data.planning,false);
});
test('补缴草稿可取消、可重进；未经确认不能用假设示例替换当前方案',()=>{
 const open=browser(),p=guiping(open);p.calculate();p.openPaymentPlanner();p.missingStart({detail:{value:'2012'}});for(let y=2012;y<=2021;y++)p.missingYear({currentTarget:{dataset:{year:y}}});
 p.applyMissingPlan();assert.match(p.data.error,/未确认/);assert.equal(p.data.result,null);assert.equal(p.data.planReturn.result.chosen.timeline.receivingAge,69);assert.equal(p.data.form.gxMakeupRows.length,0);
 p.onUnload();const next=open();assert.equal(next.data.planning,true);assert.equal(next.data.gxPlan.count,10);next.cancelPaymentPlanner();assert.equal(next.data.result.chosen.timeline.receivingAge,69);assert.equal(next.data.form.firstPaidYear,'');
});
test('确认实际十漏年后，复用原引擎算60岁；只有明确的年份进入主结果',()=>{
 const p=guiping();p.calculate();p.openPaymentPlanner();p.missingStart({detail:{value:'2012'}});for(let y=2012;y<=2021;y++)p.missingYear({currentTarget:{dataset:{year:y}}});p.missingConfirm();p.applyMissingPlan();
 assert.equal(p.data.error,'');assert.equal(p.data.planning,false);assert.equal(p.data.result.chosen.timeline.receivingAge,60);assert.equal(p.data.result.chosen.total,'2000.00');assert.equal(p.data.result.makeup.addedYears,10);assert.equal(p.data.result.makeup.subsidy,'0.00');assert.equal(p.data.planReturn,null);
});
test('已知首次年份太近或年龄太小时，不制造补十五年的早领示例',()=>{
 const p=guiping();p.calculate();p.openPaymentPlanner();p.missingStart({detail:{value:'2021'}});assert.equal(p.data.planIllustration.limited,true);assert.match(p.data.planIllustration.note,/更早的年度能否补/);
 const policy=getRegion('450800','guiping');assert.equal(experience.illustration(p.data.form,{age:16,openingAmount:'0.00'},policy).limited,true);
 assert.equal(experience.illustration(p.data.form,{age:59,openingAmount:'bad'},policy),null);
 assert.equal(experience.illustration(p.data.form,p.data.planReturn.result,getRegion('440100')),null);
});
test('页面投影不放宽底层补缴和过渡资格校验，不能通过估算自动审批',()=>{
 const p=guiping();p.calculate();const input=experience.projectionInput({...p.data.form,ageOnly:false,birth:'1967-10',gxMakeupRows:[{mode:'missing',start:'2012',end:'2021',target:200}],gxStartYear:'2012'});
 assert.equal(input.gxScopeReviewed,'unknown');assert.throws(()=>calculate(input),/先确认/);
 const q=experience.projectionInput({...input,birth:'1966-10',gxMakeupRows:[],gxTransitionEnabled:'yes',gxTransitionStart:'2012-01',gxTransitionYears:'10'});assert.equal(q.gxTransitionReviewed,'unknown');assert.throws(()=>calculate(q));
});
test('居民恢复默认保留桂平，清个人旧方案；三工具重填都保留所选城市',()=>{
 const p=guiping();p.calculate();p.openPaymentPlanner();p.reset();assert.equal(p.data.form.regionId,'450800');assert.equal(p.data.form.localArea,'guiping');assert.equal(p.data.form.age,'55');assert.equal(p.data.form.tier,200);assert.equal(p.data.form.gxMakeupRows.length,0);assert.equal(p.data.planning,false);assert.equal(p.data.planReturn,null);p.calculate();assert.equal(p.data.error,'');
 for(const relative of ['pages/index/index.js','flexible/pages/calc/calc.js']){const q=browser()(relative);q.regionChanged({detail:{regionId:'450800'}});q.reset();assert.equal(q.data.form.regionId,'450800',relative);assert.equal(q.data.result,null);}
});
test('单一修改入口、三项结果顺序及主表不出现专业资格字段形成界面约束',()=>{
 const w=fs.readFileSync(path.join(__dirname,'../miniprogram/resident/pages/calc/calc.wxml'),'utf8');
 assert.equal((w.match(/bindtap="openPaymentPlanner"/g)||[]).length,1);assert.equal(w.includes('不只一种交法'),false);assert.equal(w.includes('data-key="ordinary"'),false);assert.equal(w.includes('data-key="eligible"'),false);
 const main=w.slice(w.indexOf('<block wx:if="{{region.status'),w.indexOf('<view wx:if="{{result.referenceLabel}}"'));
 assert.equal(main.includes('data-key="gxTransitionStart"'),false);assert.equal(main.includes('data-key="gxStartYear"'),false);assert.ok(w.indexOf('退休后，每月约领')<w.indexOf('接下来这样交'));assert.ok(w.indexOf('接下来这样交')<w.indexOf('<view>换个方案</view>'));
});
test('同一入口保留既有提档，不把已交年份再次选成漏缴，不吞掉已有费用',()=>{
 const p=guiping();p.setData({'form.gxStartYear':'2012','form.gxScopeReviewed':'yes','form.gxMakeupRows':[{mode:'upgrade',start:'2022',end:'2022',original:200,target:6000}]});p.calculate();assert.equal(p.data.error,'');
 p.openPaymentPlanner();assert.equal(p.data.gxPlan.years.find(x=>x.year===2022).paid,true);p.missingYear({currentTarget:{dataset:{year:2022}}});assert.equal(p.data.gxPlan.selected.includes(2022),false);
 for(let y=2012;y<=2021;y++)p.missingYear({currentTarget:{dataset:{year:y}}});p.missingConfirm();p.applyMissingPlan();assert.equal(p.data.error,'');assert.equal(p.data.result.makeup.upgradedYears,1);assert.equal(p.data.result.makeup.addedYears,10);assert.equal(p.data.result.chosen.total,'7800.00');assert.equal(p.data.result.chosen.timeline.receivingAge,60);
});

// 贵港仅显示市级入口；桂平旧记录保留校验，不再单独突出为一个地区。
test('贵港隐藏单独桂平选择，新旧方案统一显示市名且保留制度起点校验',()=>{
 const city=getRegion('450800'),old=getRegion('450800','guiping');
 assert.equal(city.hideAreaPicker,true);assert.equal(old.hideAreaPicker,true);assert.equal(old.gxSchemeYear,2012);assert.equal(old.areaName,'');assert.equal(city.referenceLabel,old.referenceLabel);assert.equal(old.referenceLabel.includes('桂平'),false);
 const p=guiping();p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.region,'贵港市');assert.equal(p.data.result.chosen.timeline.receivingAge,69);
 const open=browser(),saved=guiping(open);saved.calculate();saved.setData({'result.region':'贵港市 · 桂平市','result.referenceLabel':'桂平缴费／补缴 · 自治区待遇参考'});const total=saved.data.result.chosen.total;saved.onHide();const restored=open();assert.equal(restored.data.result.region,'贵港市');assert.equal(restored.data.result.referenceLabel,city.referenceLabel);assert.equal(restored.data.result.chosen.total,total);assert.equal(restored.data.form.localArea,'guiping');
 const w=fs.readFileSync(path.join(__dirname,'../miniprogram/resident/pages/calc/calc.wxml'),'utf8');assert.ok(w.includes('region.areas && !region.hideAreaPicker'));assert.ok(w.includes('<view>换个方案</view>'));assert.equal(w.includes('调整交法'),false);
});
