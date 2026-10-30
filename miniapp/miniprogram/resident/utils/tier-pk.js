const payback=require('./payback'),D=require('../../vendor/decimal');
const receipts=require('./receipt-stream');
let pending=null;
const money=n=>new D(n||0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,',');
function snapshot(data){const r=data.result;if(!r||!r.chosen||!r.scenarios)throw Error('请先完成计算');if(data.planning||data.referencePlan||data.planIllustration||data.quickPlan)throw Error('请先返回当前已计算的方案，再比较档次');const region=data.region||{};if(region.annualInput)throw Error('本地可选档次尚未核齐，暂不能多档对比');
 const plans=r.scenarios.map(s=>{const p=payback.display(r,s),t=s.timeline||{};return {normalCost:t.normalCost,immediateCost:s.immediateCost||0,lumpCost:s.lumpCost,futureCost:s.total,futureYears:t.futureNormalYears,autoYears:s.automaticMakeup?s.automaticMakeup.addedYears:0,ageSteps:s.ageSteps||[],ageIncreaseSummary:s.ageIncreaseSummary||'',receiptAgeMonths:s.receiptAgeMonths,tier:Number(s.annual),current:s.annual===r.chosen.annual,monthly:Math.round((Number(s.low)+Number(s.high))/20)*10,receipt:s.receiptMonth||s.receiptYear+'年',age:t.receivingAge,years:t.normalYears||0,normal:money(t.normalCost),immediate:money(s.immediateCost),lump:money(s.lumpCost),lumpYears:s.lumpYears||0,lumpAge:t.lumpAge,future:p.futureAmount,total:p.totalAmount,totalLabel:p.totalLabel,totalNote:p.totalNote,recovery:p.text,recoveryMonths:p.months,recoveryLabel:p.label,recoveryScope:p.scope,recoveryCost:p.total||new D(s.total).plus(p.scope==='all'?r.pastPaid||0:0).toFixed(2),annualTotal:s.annualTotal||s.annual,locked:t.lockedAnnual,lockedYear:t.lockedYear};}).filter(s=>Number.isFinite(s.monthly)&&s.monthly>0).sort((a,b)=>a.tier-b.tier);
 if(plans.length>1&&new Set(plans.map(p=>[p.monthly,p.receipt,p.future,p.total].join('|'))).size===1)throw Error('当前已无需续缴，换未来档次不会改变结果');
 if(plans.length<2)throw Error('当前资料下只有一个可计算方案，请先调整缴费档次');
 const facts=require('../../utils/share-card').fromPage('resident',data).personal;if(facts&&r.pastPaid!=null)facts.facts=facts.facts.map(f=>f.label==='历史自费'?{...f,value:new D(r.pastPaid).toFixed(2).replace(/\.00$/,'').replace(/\B(?=(\d{3})+(?!\d))/g,',')+' 元'}:f);if(facts&&!facts.facts.some(f=>f.label==='历史自费'))facts.facts.push({label:'以前个人缴费',value:'未填写'});if(facts&&r.estimated)facts.facts=facts.facts.map(f=>f.label==='历史自费'?{label:'以前个人缴费（估算）',value:f.value}:f);if(facts&&facts.planName)facts.facts.push({label:'方案范围',value:facts.planName});return {facts:facts?facts.facts:[],region:r.region||region.name,autoPlan:!!r.autoPlan,asOf:data.form.asOf,plans,current:Number(r.chosen.annual),sources:r.sources||region.sources||[],details:r.warnings||[],notes:[r.baseYear?'基础待遇参考参数：'+r.baseYear+'年。':'',r.referenceLabel,region.annualInput?'年缴金额为按当地规则核对后的输入值，并非统一官方档次。':region.continuous?'按当地连续可选金额计算，不代表只有以下档次。':'按当地已录入缴费档次计算。',r.estimated?'历史账户按填写记录估算，非查询余额。':'',data.form.historyUncertain?'历史记录不完整，以下为估算情景。':'',data.form.ageOnly?'起领年份按年龄估算，准确月份需核对出生年月。':'',r.autoPlan?'各档补缴按各年度可选档次分别计算。':r.makeup?'各列沿用同一笔历史补缴／提档费用，不随未来档次重算。':'',plans.some(p=>p.locked)?'今年实际档次保持不变，只比较以后缴费。':'',plans.some(p=>p.lumpYears)?'到龄补缴须符合当地条件并经办核定。':'','未来利息及年度普调未计入，结果以社保核定为准。'].filter(Boolean)};
}
function open(data,wx){try{pending=snapshot(data);wx.navigateTo({url:'/resident/pages/compare/compare'});}catch(e){wx.showToast({title:e.message,icon:'none'});}}
function take(){const v=pending;pending=null;return v;}
function defaults(p){const n=p.plans.length,c=p.plans.findIndex(x=>x.current);return [...new Set([p.plans[0].tier,p.plans[c<0?n-1:c].tier,p.plans[n-1].tier])].sort((a,b)=>a-b);}
function selected(p,ids){if(ids.length<2||new Set(ids).size!==ids.length)throw Error('请至少选择2个档次');const list=p.plans.filter(x=>ids.includes(x.tier));if(list.length!==ids.length)throw Error('档次已失效，请重新计算');return list;}
function receiptAge(x){return Number.isFinite(x.receiptAgeMonths)?x.receiptAgeMonths/12:x.age;}
function ageAt(x,months){const age=receiptAge(x);return age!=null&&Number.isFinite(Number(age))&&Number.isFinite(months)?Math.floor((Math.round(Number(age)*12)+months)/12)+'岁':'';}
function table(p,ids,period=20,reveal=true){
 if(!Number.isInteger(period)||period<1||period>50)throw Error('请选择领取年数');
 const list=selected(p,ids),shared=[],row=(id,label,key,kind='detail',section='main')=>({id,label,kind,section,values:list.map(x=>!reveal&&id==='monthly'?'****':String(key(x)))});
 const cash=v=>new D(String(v||0).replace(/,/g,'')),exact=v=>cash(v).toFixed(2).replace(/\.00$/,'').replace(/\B(?=(\d{3})+(?!\d))/g,','),receipt=x=>x.receipt+'\n'+(x.age||'—')+'岁';
 const rows=[row('future','还需交合计',x=>exact(x.futureCost??x.future)+'元','cost'),row('monthly','每月约领',x=>money(x.monthly)+'元','income')];
 if(new Set(list.map(receipt)).size===1)shared.push({label:'开始领取',value:list[0].receipt+' · '+(list[0].age||'—')+'岁'});
 else rows.push(row('receipt','开始领取',receipt));
 if(list.some(x=>cash(x.immediate).plus(cash(x.lump)).gt(0)))rows.push(row('makeup','其中：补缴',x=>{
  const total=cash(x.immediateCost??x.immediate).plus(cash(x.lumpCost??x.lump));if(total.isZero())return '无需补缴';
  const timing=[];if(cash(x.immediate).gt(0))timing.push(x.autoYears?'补'+x.autoYears+'年':'含补缴／补差');
  if(x.lumpYears)timing.push(x.lumpAge+'岁补'+x.lumpYears+'年');return exact(total)+'元'+(timing.length?'\n'+timing.join(' · '):'');
 }));
 if(list.some(x=>x.years>0))rows.push(row('normal','其中：按年交',x=>x.years?exact(x.normalCost??x.normal)+'元\n'+(x.locked!=null&&x.futureYears!=null?'今年'+exact(x.locked)+'元'+(x.futureYears?'\n以后'+exact(x.annualTotal)+'元×'+x.futureYears+'年':''):exact(x.annualTotal)+'元×'+x.years+'年'):'无需按年交'));
 rows.push(row('recovery','领取后回本',x=>x.recovery==='无需再交'||x.recovery==='无需回本'?x.recovery:x.recovery+(ageAt(x,x.recoveryMonths)?'\n（'+ageAt(x,x.recoveryMonths)+'）':'')));
 if(list[0].totalLabel==='前后总共交'&&list.some(x=>x.total!==x.future))rows.push(row('total','已交＋还需交',x=>exact(x.recoveryCost)+'元','detail','extra'));
 if(list.some(x=>x.ageSteps&&x.ageSteps.length))rows.push(row('ageSteps','到龄加发',x=>x.ageSteps?.length?x.ageSteps.map((s,i)=>s.age+'岁 '+(i?'再':'')+'+'+s.delta+'元').join('\n'):'起领已含或无后续加发','detail','extra'));
 rows.push(row('cumulative','领取'+period+'年累计',x=>money(receipts.cumulative(x.monthly,x.ageSteps,period*12))+'元'+(ageAt(x,period*12)?'\n（'+ageAt(x,period*12)+'）':''),'detail','extra'));
 const deltas=list.map(x=>receipts.cumulative(x.monthly,x.ageSteps,period*12).minus(x.recoveryCost).toDecimalPlaces(0));
 rows.push({id:'balance',label:'扣除缴费后',kind:'balance',section:'extra',values:deltas.map(v=>(v.gt(0)?'+':v.lt(0)?'−':'')+money(v.abs())+'元'),tones:deltas.map(v=>v.gt(0)?'positive':v.lt(0)?'negative':'neutral')});
 for(const r of rows)r.section='main';
 return {columns:list.map(x=>({tier:x.tier,label:String(x.tier).replace(/\B(?=(\d{3})+(?!\d))/g,',')+'元／年',current:x.current})),rows,shared,facts:(p.facts||[]).filter(f=>!(['当前账户','历史自费'].includes(f.label)&&f.value==='0 元')),period,recoveryBasis:list[0].recoveryScope==='all'?'回本按以前个人缴费＋还需交合计计算。':'回本只计还需交合计，未含以前缴费。',balanceBasis:list[0].recoveryScope==='all'?'累计领取 − 全部个人缴费':'累计领取 − 还需交合计（未含以前）',notes:[...p.notes,list[0].totalNote||'','还需交合计＝补缴费用＋从现在起的按年缴费。','回本从开始领取起算，按月领抵回个人缴费，不是投资收益。','累计领取按各自起领后'+period+'年计算，未计未来普调。'].filter(Boolean),region:p.region,asOf:p.asOf};
}
module.exports={snapshot,open,take,defaults,selected,table};
