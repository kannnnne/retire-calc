const test=require('node:test'),assert=require('node:assert/strict');
const pk=require('../miniprogram/resident/utils/tier-pk'),{page}=require('../scripts/resident-module-harness'),layout=require('../miniprogram/utils/pk-layout').layout;
function basic(id='450800',age=59){const q=page('basic');q.onLoad();q.regionChoice({detail:{regionId:id}});q.setData({'form.age':String(age),'form.asOf':'2026-10'});q.calculate();assert.ok(q.data.result,q.data.error);return q;}
const number=s=>Number(String(s).split('\n')[0].replace(/[^\d.-]/g,''));
test('截图案例首先给还需交与月领，费用拆项相加等于合计，起领相同只写一次',()=>{
 const p=pk.snapshot(basic().data),t=pk.table(p,[200,2000,6000]);assert.deepEqual(t.rows.slice(0,2).map(r=>r.id),['future','monthly']);
 assert.deepEqual(t.rows[0].values,['3,000元','29,000元','65,000元']);assert.deepEqual(t.rows[1].values,['210元','400元','660元']);
 assert.equal(t.shared.length,1);assert.match(t.shared[0].value,/2027-11.*60岁/);assert.ok(!t.rows.some(r=>r.id==='receipt'));
 for(let i=0;i<3;i++)assert.equal(number(t.rows.find(r=>r.id==='makeup').values[i])+number(t.rows.find(r=>r.id==='normal').values[i]),number(t.rows[0].values[i]));
 assert.equal(t.rows.find(r=>r.id==='normal').values[0],'400元\n200元×2年');assert.ok(t.rows.every(r=>r.section==='main'));
});
test('不同起领时间保留逐档；无补缴不多造0元行，未知历史不拿账户当本金',()=>{
 const q=basic(),p=pk.snapshot(q.data),plans=p.plans.slice(0,2).map((x,i)=>({...x,receipt:i?'2028-11':'2027-11'})),t=pk.table({...p,plans},plans.map(x=>x.tier));assert.equal(t.shared.length,0);assert.ok(t.rows.some(r=>r.id==='receipt'));
 const only=basic('450800',30),annual=pk.table(pk.snapshot(only.data),[200,6000]);assert.ok(!annual.rows.some(r=>r.id==='makeup'));
 q.data.result.pastPaid=null;q.data.result.openingAmount='95000';const u=pk.table(pk.snapshot(q.data),[200,6000]);assert.ok(u.facts.some(f=>f.label==='以前个人缴费'&&f.value==='未填写'));assert.ok(!u.rows.some(r=>r.id==='total'));assert.match(u.recoveryBasis,/未含以前/);
});
test('历史支出只在公共资料和领取明细中，已交金额不加进还需交合计',()=>{
 const q=page('calc');q.onLoad({module:'makeup'});q.regionChoice({detail:{regionId:'450800'}});q.setData({'form.age':'59','form.asOf':'2026-10','form.years':'5','form.pastAnnual':'200','form.tier':200,'form.paidThisYear':'yes'});q.moduleCalculate();assert.ok(q.data.result,q.data.error);
 const p=pk.snapshot(q.data),t=pk.table(p,[200,6000]);assert.ok(t.facts.some(f=>f.label.includes('以前个人缴费')&&f.value==='1,000 元'));const total=t.rows.find(r=>r.id==='total');assert.equal(total.section,'main');for(let i=0;i<2;i++)assert.equal(number(total.values[i])-number(t.rows[0].values[i]),1000);
});
test('带今年锁定档和小数年额时，费用明细与真实引擎一致，不隐藏金额差异',()=>{
 for(const id of ['440800','510100']){const q=page('basic');q.onLoad();q.regionChoice({detail:{regionId:id}});q.setData({'form.age':'55','form.asOf':'2026-10'});if(id==='440800')q.currentTier({detail:{value:1}});q.calculate();assert.ok(q.data.result,q.data.error);const p=pk.snapshot(q.data),ids=pk.defaults(p),t=pk.table(p,ids);
  for(let i=0;i<ids.length;i++){const value=id=>number(t.rows.find(r=>r.id===id)?.values[i]||'0');assert.ok(Math.abs(value('future')-value('makeup')-value('normal'))<.01);const s=q.data.result.scenarios.find(s=>s.annual===ids[i]);assert.ok(Math.abs(value('future')-Number(s.total))<.01);}
  if(id==='440800')assert.ok(t.rows.find(r=>r.id==='normal').values.every(v=>v.includes('今年180元')));if(id==='510100')for(const [i,plan] of pk.selected(p,ids).entries()){const line=t.rows.find(r=>r.id==='normal').values[i].split('\n').at(-1),m=line.match(/^([\d,.]+)元×(\d+)年$/);assert.ok(m);assert.equal(Number(m[1].replace(/,/g,'')),plan.annualTotal);}
 }
});
test('两列资料保留，15档在同一横表中，累计和净额没有第二张表头',()=>{
 const t=pk.table(pk.snapshot(basic().data),[200,2000,6000]),image=layout(t,true,true),age=image.ops.find(o=>o.text==='当前年龄：59岁'),paid=image.ops.find(o=>o.text==='累计已交：0年');assert.equal(age.y,paid.y);assert.ok(paid.x>age.x);
 const p=pk.snapshot(basic().data),all=layout(pk.table(p,p.plans.map(x=>x.tier)),true,true);assert.ok(all.width>1000&&all.width<=3800);assert.ok(all.height<3000);assert.equal(all.ops.filter(o=>o.text==='以后年缴').length,1);assert.equal(all.ops.filter(o=>o.text&&/^第\d+组/.test(o.text)).length,0);assert.equal(all.ops.filter(o=>o.op==='code').length,1);
 const hidden=layout(t,false,true);assert.ok(hidden.ops.some(o=>o.text==='****'));assert.ok(hidden.ops.some(o=>o.text==='3,000元'));
});
test('累计领取和净额默认在主表，直接选1至50年，分享同样只有一张完整表',()=>{
 const q=basic();pk.open(q.data,{navigateTo(){}});const c=page('compare');c.onLoad();assert.ok(c.data.table.mainRows.some(r=>r.id==='cumulative'));assert.ok(c.data.table.mainRows.some(r=>r.id==='balance'));assert.equal(c.data.showReceipts,undefined);c.period({detail:{value:49}});assert.ok(c.data.table.mainRows.some(r=>r.label==='领取50年累计'));c.share();const share=require('../miniprogram/utils/share-card').take();const drawing=layout(share.comparison,true,true);assert.equal(drawing.ops.filter(o=>o.text==='以后年缴').length,1);assert.ok(drawing.ops.some(o=>o.text==='扣除缴费后'));assert.ok(!drawing.ops.some(o=>o.text&&o.text.startsWith('领取明细')));
});
