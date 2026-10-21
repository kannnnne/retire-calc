const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies'),local=require('../miniprogram/utils/local-resident-policies'),documents=require('../miniprogram/utils/city-documents');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const fees=[200,300,400,500,600,700,800,900,1000,1500,2000,3000,4000,5000,6000],grants=[35,40,45,60,65,70,100,120,150,175,200,200,200,200,200];
const form=(patch={})=>({regionId:'450200',localArea:'rongshui',birth:'1966-10',asOf:'2026-10',years:'15',balance:'30000',pastAnnual:'200',tier:200,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',...patch});

test('融水本地最低标准只作用于本县，不把2010报道年份猜成原制度具体年月',()=>{
 const common=registry.capability('450200','resident'),p=local.resolve(common,'rongshui');assert.equal(common.provincial,true);assert.equal(p.provincial,false);assert.equal(p.base,186);assert.equal(p.baseYear,2025);assert.equal(p.age65Extra,5);assert.equal(p.gxSchemeStart,undefined);assert.equal(p.gxSchemeStartYear,undefined);assert.match(p.referenceText,/不自动预填/);assert.throws(()=>calculate(form({localArea:'unknown'})),/有效/);
 for(const [birth,base]of [['1966-10',186],['1961-10',191]]){const r=calculate(form({birth}));assert.match(r.region,/融水苗族自治县/);assert.match(r.referenceLabel,/本地最低/);assert.equal(r.chosen.base,base.toFixed(2));assert.equal(r.chosen.low,(base+30000/139).toFixed(2));assert.equal(r.chosen.total,'0.00');}
});

test('融水采用柳州已核15档及补贴，普通年缴与继续年缴保留本县来源标签',()=>{
 for(const [i,tier]of fees.entries()){
  const s=calculate(form({birth:'1971-10',years:'14',paidThisYear:'no',tier})).chosen;assert.equal(s.total,tier.toFixed(2));assert.equal(s.subsidy,grants[i].toFixed(2));assert.equal(s.account,(30000+tier+grants[i]).toFixed(2));assert.equal(s.base,'186.00');
  const r=calculate(form({birth:'1971-10',payUntil:'SIXTY',tier}));assert.equal(r.chosen.timeline.normalYears,4);assert.equal(r.chosen.total,(tier*4).toFixed(2));assert.equal(r.chosen.base,'194.00');assert.match(r.referenceLabel,/融水/);
 }
});

test('融水补足仍须核定年月和年数，不因报道2010实施就自动批准补足',()=>{
 const f=form({birth:'1960-10',years:'11',paidThisYear:'no',tier:6000,gxTransitionEnabled:'yes',gxTransitionStart:'2010-01',gxTransitionYears:'4',gxTransitionReviewed:'yes'}),r=calculate(f),s=r.chosen;
 assert.equal(s.total,'24000.00');assert.equal(s.subsidy,'800.00');assert.equal(s.account,'54800.00');assert.equal(s.base,'191.00');assert.equal(s.low,'585.24');
 assert.throws(()=>calculate({...f,gxTransitionStart:''}),/建立年月/);assert.throws(()=>calculate({...f,gxTransitionReviewed:'unknown'}),/经办核定/);
});

test('梧州2026文的旧166不当当前数，先登记后具体年度补费无历史补贴',()=>{
 const p=registry.capability('450400','resident');assert.equal(p.base,186);assert.equal(p.provincial,true);assert.deepEqual(p.tiers,fees);assert.deepEqual(p.subsidies,grants);assert.match(p.referenceText,/166元是旧/);assert.match(p.paymentNote,/先申请参保登记/);
 const r=calculate(form({regionId:'450400',localArea:'',birth:'1961-10',years:'0',balance:'0',never:true,paidThisYear:'no',gxStartYear:'2012',gxScopeReviewed:'yes',gxMakeupRows:[{mode:'missing',start:'2012',end:'2025',target:200}]})),s=r.chosen;
 assert.equal(r.makeup.addedYears,14);assert.equal(r.makeup.subsidy,'0.00');assert.equal(r.makeup.cost,'2800.00');assert.equal(s.total,'3000.00');assert.equal(s.subsidy,'35.00');assert.equal(s.account,'3035.00');assert.equal(s.low,'212.83');assert.equal(s.timeline.normalYears,1);assert.equal(s.timeline.finalYears,15);assert.equal(s.receiptYear,2026);
});

test('河池2018原件的100元只属困难保留，不给普通人员增加100档或旧期限锁',()=>{
 const p=registry.capability('451200','resident');assert.equal(p.provincial,true);assert.deepEqual(p.tiers,fees);assert.equal(p.currentYearTierLock,undefined);
 assert.throws(()=>calculate(form({regionId:'451200',localArea:'',tier:100})),/当地缴费档次/);
 for(const [i,tier]of fees.entries()){const r=calculate(form({regionId:'451200',localArea:'',birth:'1971-10',years:'14',paidThisYear:'no',tier}));assert.equal(r.chosen.total,tier.toFixed(2));assert.equal(r.chosen.subsidy,grants[i].toFixed(2));assert.match(r.referenceLabel,/河池市 · 广西标准参考/);}
});

test('新增五份地方原件在政策列表按市和居民类型隔离，不泄漏为职工公式依据',()=>{
 for(const [id,city]of [['lz-rongshui-base-2025','450200'],['lz-resident-makeup-original-2023','450200'],['wz-resident-tiers-2026','450400'],['wz-resident-new-registration-2025','450400'],['hc-resident-tiers-original-2018','451200']]){
  const d=documents.find(s=>s.id===id);assert.deepEqual(d.cityIds,[city]);assert.equal(d.kind,'resident');const p=registry.capability(city,'resident').sources.find(s=>s.id===id);assert.equal(p.checkedAt,'2026-10-19');assert.ok(p.publisher);
  for(const c of registry.cities){assert.ok(!c.employee.sources.some(s=>s.id===id));if(c.id!==city)assert.ok(!c.resident.sources.some(s=>s.id===id));}
 }
});


test('深圳年龄加发从达龄次月起，初领恰在65岁生日月不得提前加50元',()=>{
 for(const [asOf,year,age,base]of [['2026-04',2026,64,240],['2026-05',2026,65,240],['2026-06',2026,65,290],['2026-07',2026,65,290]]){
  const r=calculate(form({regionId:'440300',localArea:'',tier:360,birth:'1961-06',asOf}));assert.equal(r.chosen.timeline.receivingAge,age);assert.equal(r.chosen.receiptYear,year);assert.equal(r.chosen.base,base.toFixed(2));assert.equal(r.chosen.low,(base+30000/139).toFixed(2));
 }
 const dec=calculate(form({regionId:'440300',localArea:'',tier:360,birth:'1962-01',asOf:'2026-12'}));assert.equal(dec.chosen.receiptYear,2027);assert.equal(dec.chosen.base,'240.00');
 const jan=calculate(form({regionId:'440300',localArea:'',tier:360,birth:'1962-01',asOf:'2027-01'}));assert.equal(jan.chosen.base,'290.00');
});

test('深圳次月加发标记只归深圳，不改变融水等其他已录入城市的年龄口径',()=>{
 for(const c of registry.cities)assert.equal(!!c.resident.ageExtraNextMonth,c.id==='440300');
 const r=calculate(form({birth:'1961-06',asOf:'2026-05'}));assert.equal(r.chosen.timeline.receivingAge,65);assert.equal(r.chosen.base,'191.00');
 const rule=registry.capability('440300','resident').sources.find(s=>s.id==='sz-resident-local-rule');assert.match(rule.text,/生日当月提前/);assert.equal(rule.checkedAt,'2026-10-19');
});
