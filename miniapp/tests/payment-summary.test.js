const test=require('node:test'),assert=require('node:assert/strict');
const {page}=require('../scripts/pension-page-harness'),cards=require('../miniprogram/utils/share-card'),{summary,ageAt}=require('../miniprogram/utils/payment-summary');
function fixture(kind,store={}){const q=page(kind,store);q.setData({firstAuto:false,'form.birthMonth':'1992-10','form.firstInsuredMonth':'2016-07','form.dataAsOf':'2026-10',...(kind==='flexible'?{'form.unitYears':10,'form.unitMonths':4,'form.flexYears':0,'form.flexMonths':0}:{})});if(kind==='employee')q.refreshDerived();else q.refresh();q.calculate();assert.ok(q.data.result,q.data.error);return q;}
const choose=(q,plan)=>q.choosePlan({currentTarget:{dataset:{plan}}});
test('截图职工与灵活：20年是门槛，交到退休累计39年4个月；换成停缴方案累计20年',()=>{
 for(const kind of ['employee','flexible']){const q=fixture(kind),a=q.data.result.chosen;assert.equal(a.minimumMonths,240);assert.equal(a.futureMonths,348);assert.equal(a.totalDuration,'39年4个月');assert.equal(a.remainingDuration,'29年');assert.equal(a.paymentEnd,'2055-10（63岁）');const monthly=a.monthly;
 choose(q,'MINIMUM_STOP');const b=q.data.result.chosen;assert.equal(b.minimumMonths,240);assert.equal(b.totalDuration,'20年');assert.equal(b.remainingDuration,'9年8个月');assert.equal(b.paymentEnd,'2036-06（43岁）');assert.equal(b.receiptMonth,a.receiptMonth);assert.notEqual(b.monthly,monthly);
 const p=cards.fromPage(kind,q.data).personal;assert.equal(p.receiptAge,'63岁');assert.equal(p.planName,'交够20年后停缴');assert.equal(p.rows.find(x=>x.label==='交完累计').value,'20年');assert.equal(Number(p.rows.find(x=>x.label==='还需交合计').value.replace(/[^\d.]/g,'')),Number(b.futurePersonalCost));}
});
test('分享年龄只显示整岁，保留真实缴费月数和小数费用；各方案对应自己的日期与累计',()=>{
 for(const kind of ['employee','flexible']){const q=fixture(kind);for(const plan of ['CURRENT','MINIMUM','MINIMUM_STOP','CUSTOM']){if(plan==='CUSTOM'){q.setData({'form.customMonths':150});q.calculate();}choose(q,plan);const s=q.data.result.chosen,p=cards.fromPage(kind,q.data).personal;assert.ok(p);assert.match(p.receiptAge,/^\d+岁$/);assert.equal(p.rows[0].label,'每月自己交');assert.equal(p.rows[1].label,'还要交');assert.equal(p.rows[2].label,'还需交合计');assert.equal(p.rows.at(-1).value,s.totalDuration);assert.ok(!p.planName.includes('岁1个月'));if(['CURRENT','MINIMUM'].includes(plan))assert.match(p.planName,/退休（63岁）/);}}
});
test('有停缴、到龄后延缴、已经交够和不足门槛时，不把最低年限当实际方案总年数',()=>{
 const s={plan:'CURRENT',qualified:true,futureMonths:24,totalMonths:240,minimumMonths:240,lastPaymentMonth:'2057-10',monthlyPersonalPayment:'1104.20',futurePersonalCost:'26500.80'},p=summary(s,'1992-10','2055-10');assert.equal(p.planName,'按此金额交到65岁');assert.equal(p.paymentText,'1,104.20');assert.equal(p.costText,'26,500.80');assert.equal(p.totalDuration,'20年');
 assert.equal(summary({...s,futureMonths:0,totalMonths:300},'1992-10','2055-10').remainingDuration,'0个月');assert.equal(summary({...s,futureMonths:1,totalMonths:125,qualified:false},'1992-10','2055-10').totalDuration,'10年5个月');assert.equal(ageAt('1992-10','2055-11'),'63岁');
 for(const kind of ['employee','flexible']){const q=fixture(kind);q.setData({'form.pauseMonths':12});q.calculate();const a=q.data.result.chosen;assert.equal(a.futureMonths,336);assert.equal(a.totalDuration,'38年4个月');assert.equal(a.lastPaymentMonth,'2055-10');}
});
test('重新打开旧会话重新生成摘要，不能残留其他方案的累计与截止日期',()=>{
 for(const kind of ['employee','flexible']){const store={},q=fixture(kind,store);choose(q,'MINIMUM_STOP');q.onHide();delete store[kind].result.chosen.totalDuration;for(const s of store[kind].result.scenarios)delete s.totalDuration;const restored=page(kind,store);assert.equal(restored.data.result.chosen.totalDuration,'20年');assert.equal(restored.data.result.chosen.paymentEnd,'2036-06（43岁）');}
});
