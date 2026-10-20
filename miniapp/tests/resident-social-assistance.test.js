const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {calculate}=require('../miniprogram/resident/utils/calculate'),registry=require('../miniprogram/utils/city-policies');
const form=(patch={})=>({regionId:'440700',birth:'1970-10',asOf:'2026-10',years:'11',balance:'0',pastAnnual:'360',tier:4800,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',socialAidAnnual:4800,socialAidConfirmed:'yes',...patch});

test('开平官方四年例子独立复算：个人4800加资助4800、补贴60，账户新增38640',()=>{
 const f=form(),r=calculate(f),s=r.chosen,low=calculate(form({tier:180,socialAidAnnual:0})).chosen,alone=calculate(form({socialAidAnnual:0})).chosen;
 assert.equal(s.timeline.normalYears,4);assert.equal(s.total,'38400.00');assert.equal(s.account,'38640.00');assert.equal(s.subsidy,'240.00');assert.equal(s.socialAidCost,'19200.00');assert.equal(s.socialAidYears,4);assert.equal(s.annualTotal,9600);assert.equal(s.low,(242.5+38640/139).toFixed(2));assert.equal(alone.account,'19440.00');assert.equal(low.account,'840.00');assert.ok(Math.abs((+s.low- +low.low)-(38640-840)/139)<.011);assert.equal(s.timeline.finalYears,15);assert.equal(s.lumpYears,0);assert.deepEqual(f,form());
 assert.ok(s.schedule.every(x=>x.years===1&&x.cost==='9600.00'&&x.personalCost==='4800'&&x.socialAid==='4800.00'&&x.subsidy==='60.00'));
});

test('广东20市按当地最高档限制资助，珠海1800不套4800；不改既有余额和基础待遇',()=>{
 const ids=registry.cities.filter(c=>c.provinceId==='440000'&&!c.resident.legacy);assert.equal(ids.length,20);
 for(const c of ids){
  const p=c.resident,cap=Math.max(...p.tiers),baseForm=form({regionId:c.id,birth:'1971-10',years:'5',balance:'30000',tier:p.tiers[0],socialAidAnnual:0}),base=calculate(baseForm),withAid=calculate({...baseForm,socialAidAnnual:cap}),s=withAid.chosen;
  assert.equal(p.socialAidCap,cap);assert.equal(withAid.openingAmount,'30000.00');assert.equal(s.base,base.chosen.base);assert.equal(s.subsidy,base.chosen.subsidy);assert.equal(s.timeline.finalYears,base.chosen.timeline.finalYears);assert.equal(s.lumpYears,base.chosen.lumpYears);assert.equal(+s.account- +base.chosen.account,cap*s.socialAidYears);assert.equal(+s.total- +base.chosen.total,cap*s.socialAidYears);assert.equal(s.lumpCost,base.chosen.lumpCost);assert.throws(()=>calculate({...baseForm,socialAidAnnual:cap+1}),/年度上限|每年合计不能超过/);
 }
 assert.equal(registry.city('440400').resident.socialAidCap,1800);
});

test('资助需确认共享上限，非整数合法金额可算；未核地区、广州旧入口和不合金额不静默忽略',()=>{
 for(const v of [-1,'NaN','abc','Infinity','1.001'])assert.throws(()=>calculate(form({socialAidAnnual:v})),/资助金额/);
 assert.throws(()=>calculate(form({socialAidConfirmed:'unknown'})),/没有其他集体补助或社会资助/);
 const s=calculate(form({socialAidAnnual:'123.45'})).chosen;assert.equal(s.socialAidCost,'493.80');assert.equal(s.account,'19933.80');
 for(const regionId of ['440100','110100','310100','510100','330100','610100'])assert.throws(()=>calculate(form({regionId,cdResidence:'rural',tier:registry.city(regionId).resident.tiers?.[0]||360})),/社会资助计算/);
});

test('佛山2026已确认的今年档不增加资助，未来正常年缴才加，不加补足年度',()=>{
 const f=form({regionId:'440600',birth:'1971-10',years:'5',paidThisYear:'no',currentYearTier:360,tier:4800,balance:'30000'}),plain=calculate({...f,socialAidAnnual:0}).chosen,s=calculate(f).chosen;
 assert.equal(s.timeline.lockedYear,2026);assert.equal(s.schedule[0].cost,'360');assert.equal(s.schedule[0].socialAid,'0.00');assert.equal(s.socialAidYears,s.timeline.normalYears-1);assert.equal(s.lumpCost,plain.lumpCost);assert.equal(s.lumpYears,plain.lumpYears);assert.equal(s.subsidy,plain.subsidy);assert.equal(+s.account- +plain.account,s.socialAidYears*4800);assert.ok(s.schedule.filter(x=>x.type!=='正常年缴').every(x=>!x.socialAid));
});

test('65岁只有补足年限或已经够年限且不再年缴，不能靠资助增加年数或虚构投入',()=>{
 assert.throws(()=>calculate(form({birth:'1961-10',years:'5',extended:'yes'})),/没有可安排资助/);
 assert.throws(()=>calculate(form({birth:'1966-10',years:'15'})),/没有可安排资助/);
 const s=calculate(form({birth:'1971-10',years:'16',payUntil:'SIXTY',balance:'30000'})).chosen;assert.ok(s.socialAidYears>0);assert.equal(s.socialAidCost,(s.socialAidYears*4800).toFixed(2));assert.equal(s.lumpYears,0);
});

function page(store={}){const file=path.join(__dirname,'../miniprogram/resident/pages/calc/calc.js');let definition;vm.runInNewContext(fs.readFileSync(file,'utf8'),{Page:p=>definition=p,Date,wx:{pageScrollTo(){}},require:name=>name.endsWith('/session')?{load:k=>store[k]||null,save:(k,v)=>store[k]=JSON.parse(JSON.stringify(v))}:require(path.resolve(path.dirname(file),name))});const p={...definition,data:JSON.parse(JSON.stringify(definition.data)),setData(values){for(const[key,value]of Object.entries(values)){let d=this.data,keys=key.split('.');for(const k of keys.slice(0,-1))d=d[k];d[keys.at(-1)]=value;}}};p.onLoad();return p;}

test('居民页面确认与选资助更新主账单、切档保资助、重进保留、取消和跨省清除',()=>{
 const store={},p=page(store);p.regionChoice({detail:{regionId:'440700'}});p.setData({form:{...p.data.form,...form({socialAidAnnual:0,socialAidConfirmed:'unknown'}),ageOnly:false,accountMode:'balance'}});p.refreshPolicyQuestions();p.calculate();assert.equal(p.data.error,'');const baseline=p.data.result.chosen.account;
 p.fold({currentTarget:{dataset:{key:'extraOpen'}}});assert.equal(p.data.extraOpen,true);p.socialAidConfirm({detail:{value:['yes']}});p.socialAidChoose({detail:{value:p.data.socialAidOptions.indexOf(4800)}});assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.account,'38640.00');assert.equal(p.data.result.chosen.annualTotal,9600);assert.equal(p.data.baseline.account,baseline);assert.equal(p.data.compare,true);
 p.chooseFuture({currentTarget:{dataset:{annual:180}}});assert.equal(p.data.result.chosen.socialAidAnnual,4800);p.onHide();const reopened=page(store);assert.equal(reopened.data.form.socialAidAnnual,4800);assert.equal(reopened.data.result.chosen.annual,180);
 reopened.socialAidConfirm({detail:{value:[]}});assert.equal(reopened.data.form.socialAidAnnual,0);assert.equal(reopened.data.result.chosen.socialAidCost,'0.00');reopened.regionChoice({detail:{regionId:'450100'}});assert.equal(reopened.data.form.socialAidAnnual,0);assert.equal(reopened.data.form.socialAidConfirmed,'unknown');assert.equal(reopened.data.region.socialAidCap,6000);assert.equal(reopened.data.result,null);
});

test('资助条款属于广东居民资料，江门废止通知不作为已核区县补贴或60岁补足授权',()=>{
 for(const c of registry.cities){const has=c.resident.sources.some(s=>s.id==='gd-resident-social-aid-2024');assert.equal(has,c.provinceId==='440000');assert.equal(c.employee.sources.some(s=>s.id==='gd-resident-social-aid-2024'),false);}
 const p=registry.city('440700').resident,repeal=p.sources.find(s=>s.id==='jm-resident-repeal-2026');assert.match(repeal.text,/2026年4月30日/);assert.match(repeal.text,/2028年/);assert.match(repeal.text,/不证明原有额外待遇全部取消/);assert.equal(p.ageDivisor,undefined);assert.deepEqual(p.subsidies,[30,30,30,60,60,60,60,60,60]);assert.equal(p.lumpAt60,undefined);assert.equal(p.lumpAt65,true);
 assert.ok(p.sources.some(s=>s.id==='jm-resident-aid-example-2026'));
});

test('已交够后由继续缴改为停止，清除无年度可用的资助；修改信息仍能取消资助',()=>{
 const p=page();p.regionChoice({detail:{regionId:'440700'}});p.setData({form:{...p.data.form,...form({birth:'1971-10',years:'16',balance:'30000',payUntil:'SIXTY'}),ageOnly:false,accountMode:'balance'}});p.refreshPolicyQuestions();p.calculate();assert.equal(p.data.error,'');assert.ok(p.data.result.chosen.socialAidYears>0);assert.ok(p.data.result.chosen.timeline.normalYears>0);
 p.payUntil({detail:{value:0}});assert.equal(p.data.error,'');assert.equal(p.data.form.socialAidAnnual,0);assert.equal(p.data.result.chosen.total,'0.00');assert.equal(p.data.result.chosen.timeline.normalYears,0);
 p.setData({'form.socialAidAnnual':4800});p.edit();p.socialAidCancel();assert.equal(p.data.form.socialAidAnnual,0);assert.equal(p.data.result,null);p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.socialAidCost,'0.00');
});
