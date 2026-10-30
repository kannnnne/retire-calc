const test=require('node:test'),assert=require('node:assert/strict');
const stream=require('../miniprogram/resident/utils/receipt-stream');
const {calculate}=require('../miniprogram/resident/utils/ordinary-calculate');
const {getRegion}=require('../miniprogram/resident/data/regions');
const flow=require('../miniprogram/resident/utils/module-flow');
const pk=require('../miniprogram/resident/utils/tier-pk');
const payback=require('../miniprogram/resident/utils/payback');
const policy={ageExtraNextMonth:true,ageExtras:[[65,50],[80,100]]};
const birth=1966*12+9;
function calc(asOf='2026-10',extra={}){return calculate({...flow.input({regionId:'440300',ageOnly:false,birth:'1966-10',asOf,tier:360}),never:false,years:'15',balance:'10000',...extra});}
test('生日当月不提前加发，次月已计入起领额的部分不会再加一次',()=>{
 const birthday=stream.stages(policy,birth,birth+65*12);
 assert.deepEqual(birthday.ageSteps,[{offset:1,delta:50,age:65},{offset:181,delta:50,age:80}]);
 assert.equal(stream.cumulative(300,birthday.ageSteps,1).toNumber(),300);
 assert.equal(stream.cumulative(300,birthday.ageSteps,2).toNumber(),650);
 const after=stream.stages(policy,birth,birth+65*12+1);
 assert.deepEqual(after.ageSteps,[{offset:180,delta:50,age:80}]);
 assert.equal(stream.cumulative(350,after.ageSteps,180).toNumber(),63000);
 assert.equal(stream.cumulative(350,after.ageSteps,181).toNumber(),63400);
 assert.deepEqual(stream.stages(policy,birth,birth+80*12+1).ageSteps,[]);
});
test('60岁起领跨65及80岁只增加档差，1至50年累计与逐月独立核算一致',()=>{
 const first=birth+60*12+1,{ageSteps}=stream.stages(policy,birth,first);
 for(let years=1;years<=50;years++){let expected=0;for(let i=0;i<years*12;i++){const age=Math.floor((first+i-1-birth)/12);expected+=300+(age>=80?100:age>=65?50:0);}assert.equal(stream.cumulative(300,ageSteps,years*12).toNumber(),expected);}
 assert.deepEqual(ageSteps.map(s=>s.delta),[50,50]);
});
test('回本按同一月度序列累计，整月边界、零费用、小额及大额均不偏移',()=>{
 const steps=stream.stages(policy,birth,birth+60*12+1).ageSteps;
 for(const cost of [0,1,18000,18001,25000,90000,250000]){let n=0,total=0;while(total<cost){total+=300+(n>=240?100:n>=60?50:0);n++;}assert.equal(stream.recovery(300,steps,cost),n);}
 assert.equal(stream.recovery(0,steps,100),null);
});
test('真实深圳起领模型保留原始月额，起领即65岁和80岁不重复计入',()=>{
 const sixty=calc(),birthday=calc('2031-09'),after=calc('2031-10');
 assert.equal(sixty.chosen.receiptMonth,'2026-11');
 assert.equal(sixty.chosen.receiptAgeMonths,721);
 assert.deepEqual(sixty.chosen.ageSteps,[{offset:60,delta:50,age:65},{offset:240,delta:50,age:80}]);
 assert.equal(birthday.chosen.receiptMonth,'2031-10');
 assert.equal(after.chosen.receiptMonth,'2031-11');
 assert.equal(Number(after.chosen.base)-Number(birthday.chosen.base),50);
 assert.equal(birthday.chosen.ageSteps[0].offset,1);
 assert.equal(after.chosen.ageSteps.length,1);
 assert.equal(after.chosen.ageSteps[0].delta,50);
});
test('真实方案的主卡回本、PK累计净额及分享图共用加发序列',()=>{
 const r=calc('2026-10',{years:'5',balance:'1000',pastAnnual:'1000'}),form={regionId:'440300',ageOnly:false,birth:'1966-10',asOf:'2026-10',years:'5'},data={result:r,form,region:getRegion('440300'),display:flow.display(r)};
 const snapshot=pk.snapshot(data),ids=pk.defaults(snapshot),t=pk.table(snapshot,ids,20);
 assert.ok(t.rows.find(x=>x.label.startsWith('到龄加发')));
 for(const [i,id]of ids.entries()){const p=snapshot.plans.find(x=>x.tier===id),s=r.scenarios.find(x=>x.annual===id);let sum=0,n=0;const startingMonth=s.receiptAgeMonths;
  for(let j=0;j<240;j++){const age=Math.floor((startingMonth+j-1)/12),initial=Math.floor((startingMonth-1)/12);sum+=p.monthly+(age>=80?100:age>=65?50:0)-(initial>=80?100:initial>=65?50:0);}
  const fmt=v=>Math.round(v).toLocaleString('en-US');assert.ok(t.rows.find(x=>x.label==='领取20年累计').values[i].startsWith(fmt(sum)+'元'));
  const net=sum-Number(p.recoveryCost);assert.equal(t.rows.at(-1).values[i],(net>0?'+':net<0?'−':'')+fmt(Math.abs(net))+'元');
  let received=0;while(received<Number(p.recoveryCost)){const age=Math.floor((startingMonth+n-1)/12),initial=Math.floor((startingMonth-1)/12);received+=p.monthly+(age>=80?100:age>=65?50:0)-(initial>=80?100:initial>=65?50:0);n++;}assert.equal(payback.display(r,s).months,n);
 }
 const share=require('../miniprogram/utils/share-card'),model=share.model(share.fromPage('resident',data),'personal',true),card=require('../miniprogram/utils/card-layout').layout(model,true);
 assert.ok(card.ops.some(x=>x.op==='text'&&x.text.includes('到龄加发')));
 const poster=require('../miniprogram/utils/pk-layout').layout(t,true,true);assert.ok(poster.ops.some(x=>x.text==='到龄加发'));assert.ok(poster.ops.every(x=>x.y<poster.height));
});
test('没有核实生效月份的加发不推算，广州和东莞保持原计算',()=>{
 assert.deepEqual(stream.stages({ageExtras:[[65,50]]},birth,birth+720).ageSteps,[]);
 const {page}=require('../scripts/resident-module-harness');for(const id of ['440100','441900','450800']){const q=page('basic');q.onLoad();q.regionChoice({detail:{regionId:id}});q.setData({'form.asOf':'2026-10'});q.calculate();assert.ok(q.data.result,q.data.error);assert.ok(!q.data.result.chosen.ageSteps?.length);const p=payback.display(q.data.result);assert.equal(p.months,Math.ceil(Number(p.total)/p.monthly));}
});
