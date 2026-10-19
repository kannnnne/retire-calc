const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../miniprogram/utils/city-policies');
const documents=require('../miniprogram/utils/city-documents');
const {calculate}=require('../miniprogram/resident/utils/calculate');
const options=require('../miniprogram/resident/utils/payment-options');
const gx=registry.cities.filter(c=>c.provinceId==='450000');
const form=(patch={})=>({regionId:'450100',birth:'1971-10',asOf:'2026-10',years:'15',balance:'30000',accountMode:'balance',pastAnnual:'200',tier:200,never:false,paidThisYear:'yes',eligible:'yes',ordinary:'yes',...patch});
const missing={mode:'missing',start:'2012',end:'2018',target:200};

test('广西14市15档交够后可继续年缴至60岁前，原账户不改、不套云浮额外补贴',()=>{
 assert.equal(gx.length,14);
 for(const c of gx){
  const p=c.resident;assert.equal(p.continueTo60,true);assert.equal(p.postMinimumSubsidy,undefined);
  for(const [i,tier] of p.tiers.entries()){
   const f=form({regionId:c.id,tier}),stopped=calculate(f).chosen,r=calculate({...f,payUntil:'SIXTY'}),s=r.chosen,credit=p.subsidies[i];
   assert.equal(stopped.total,'0.00');assert.equal(stopped.account,'30000.00');assert.equal(stopped.timeline.finalYears,15);
   assert.equal(s.timeline.normalYears,4);assert.equal(s.timeline.continuedYears,4);assert.equal(s.timeline.finalYears,19);assert.equal(s.timeline.lastYear,2030);assert.equal(s.receiptYear,2031);assert.equal(s.lumpYears,0);
   assert.equal(s.total,(tier*4).toFixed(2));assert.equal(s.subsidy,(credit*4).toFixed(2));assert.equal(s.account,(30000+(tier+credit)*4).toFixed(2));assert.equal(r.openingAmount,'30000.00');
   const base=c.id==='450900'?202:194;assert.equal(s.base,base.toFixed(2),c.name);assert.equal(s.low,(base+(30000+(tier+credit)*4)/139).toFixed(2));
  }
 }
});

test('广西继续年缴只用于60岁前有额外年度的人，不把不足年限或已到龄改成任意加缴',()=>{
 for(const c of gx){
  assert.throws(()=>calculate(form({regionId:c.id,birth:'1966-10',payUntil:'SIXTY'})),/60岁前/);
  assert.throws(()=>calculate(form({regionId:c.id,years:'5',payUntil:'SIXTY'})),/仍有可缴年度/);
  const r=calculate(form({regionId:c.id,years:'5'}));assert.equal(r.chosen.timeline.normalYears,10);assert.equal(r.chosen.timeline.receivingAge,65);assert.equal(r.chosen.lumpYears,0);
  const sameYear=calculate(form({regionId:c.id,birth:'1967-10',paidThisYear:'no',payUntil:'SIXTY'})).chosen;assert.equal(sameYear.timeline.normalYears,1);assert.equal(sameYear.timeline.lastYear,2026);assert.equal(sameYear.receiptYear,2027);
 }
});

test('广西历史断缴补进年限后仍可继续正常年缴，历史费用不补贴',()=>{
 for(const c of gx){
  const f=form({regionId:c.id,years:'5',balance:'1800',gxStartYear:'2012',gxScopeReviewed:'yes',gxMakeupRows:[missing]}),r=calculate({...f,payUntil:'SIXTY'}),s=r.chosen;
  assert.equal(r.makeup.addedYears,7);assert.equal(r.makeup.cost,'1400.00');assert.equal(r.makeup.subsidy,'0.00');assert.equal(r.paidYears,5);assert.equal(s.timeline.finalYears,16);assert.equal(s.timeline.continuedYears,1);assert.equal(s.total,'2200.00');assert.equal(s.subsidy,'140.00');assert.equal(s.account,'4140.00');assert.equal(s.timeline.lastYear,2030);
  assert.equal(s.base,c.id==='450900'?'190.00':'188.00');
  const preview=options.preview(c.resident,f);assert.equal(preview.available,true);assert.equal(preview.normalYears,4);
 }
});

test('广西表单仅用完整校验后的补缴年限预判方案，不采信未核对、重叠或提档行的跨度',()=>{
 const p=registry.city('450100').resident,f=form({years:'5',balance:'1800',gxStartYear:'2012',gxScopeReviewed:'yes',gxMakeupRows:[missing]}),before=JSON.stringify(f);
 assert.equal(options.preview(p,f).available,true);assert.equal(JSON.stringify(f),before);
 assert.equal(options.preview(p,{...f,gxScopeReviewed:'unknown'}).available,false);
 assert.equal(options.preview(p,{...f,gxMakeupRows:[missing,missing]}).available,false);
 assert.equal(options.preview(p,{...f,gxMakeupRows:[{mode:'upgrade',start:'2019',end:'2022',original:200,target:6000}]}).available,false);
 assert.equal(options.preview(p,{...f,accountMode:'estimate',balance:'999999',pastAnnual:'360'}).available,true);
 assert.equal(options.preview(p,{...f,accountMode:'estimate',pastAnnual:'30',pastMonthly:true}).available,true);
});

test('南宁续缴仍保留兴宁与青秀各自长缴加额，不把自治区2元覆盖本地4元',()=>{
 for(const [localArea,base] of [['xingning',229],['qingxiu',202]]){
  const r=calculate(form({localArea,payUntil:'SIXTY'})),s=r.chosen;
  assert.equal(s.timeline.finalYears,19);assert.equal(s.base,base.toFixed(2));assert.equal(s.total,'800.00');assert.equal(s.subsidy,'140.00');assert.equal(s.account,'30940.00');
 }
});

test('广西2018长缴原件与2026问答覆盖14市居民，不串广东或职工',()=>{
 for(const id of ['gx-resident-incentive-2018','gx-resident-qa']){
  const d=documents.find(d=>d.id===id);assert.equal(d.kind,'resident');assert.equal(d.cityIds.length,14);assert.match(d.url,/^http:\/\/rst\.gxzf\.gov\.cn/);
  for(const c of registry.cities){const s=c.resident.sources.find(s=>s.id===id);if(c.provinceId==='450000'){assert.ok(s,c.name);assert.equal(s.checkedAt,'2026-10-19');}else assert.equal(s,undefined,c.name);assert.equal(c.employee.sources.some(s=>s.id===id),false);}
 }
});
