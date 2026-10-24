// Draft only: generating amounts is not approval of the named make-up years.
const D=require('../../vendor/decimal'),planner=require('./history-planner'),{tiersForYear}=require('./gx-makeup');
const amount=v=>/^\d+(\.\d{1,2})?$/.test(String(v));
function records(f,selected,annual){
 const map=new Map(),asYear=Number(f.asOf.slice(0,4));
 const add=(year,value)=>{if(!Number.isInteger(year)||year<2010||year>asYear||!amount(value)||!tiersForYear(year).includes(Number(value)))throw Error('请核对已交年份及原缴费档次');if(map.has(year))throw Error('已交年份重复，请先核对分年记录');map.set(year,Number(value));};
 if(selected){const known=records(f).map;for(const y of selected)add(Number(y),known.has(Number(y))?known.get(Number(y)):annual);for(const y of known.keys())if(!map.has(y))throw Error('已填记录中的年份不能在这里删除，请返回修改原记录');}
 else if(f.historyMode==='segments'){for(const row of f.segments||[]){if(!/^\d{4}$/.test(String(row.start))||!/^\d{4}$/.test(String(row.end))||Number(row.end)<Number(row.start)||Number(row.end)-Number(row.start)>90)throw Error('请核对分年记录');for(let y=Number(row.start);y<=Number(row.end);y++)add(y,row.annual);}}
 else {for(const row of f.gxMakeupRows||[])if(row.mode==='upgrade'){if(Number(row.end)-Number(row.start)>90)throw Error('请核对提档记录');for(let y=Number(row.start);y<=Number(row.end);y++)add(y,row.original);}}
 const complete=map.size===Number(f.years)&&['yes','no'].includes(f.paidThisYear)&&(f.paidThisYear==='yes')===map.has(asYear);
 if(complete&&f.accountMode!=='balance'&&f.historyMode!=='segments'&&amount(f.pastAnnual)&&!f.pastMonthly){const total=[...map.values()].reduce((s,v)=>s.plus(v),new D(0));if(!total.eq(new D(f.pastAnnual).mul(f.years)))throw Error('原缴费金额与已填历史总额不一致，请核对');}
 return {complete,map};
}
function groups(map){const result=[];for(const [y,v]of [...map.entries()].sort((a,b)=>a[0]-b[0])){const last=result[result.length-1];if(last&&Number(last.end)+1===y&&Number(last.annual)===v)last.end=String(y);else result.push({start:String(y),end:String(y),annual:String(v)});}return result;}
function setup(f,p){
 if(p.rule!=='GUANGXI_ORDINARY')throw Error('这个快捷方案目前只用于广西居民养老');
 if(f.receiving==='yes'||f.never||Number(f.years)===0)throw Error('快捷方案用于已参保且尚未领取养老金的人员');
 if(f.historyUncertain)throw Error('请先填清已交年数，再配补缴方案');
 if(f.gxTransitionEnabled==='yes'||f.approvedPlan)throw Error('请先取消原核定补足方案，再比较历史年度补缴');
 const a=Number(f.asOf.slice(0,4)),b=f.ageOnly?a-Number(f.age):Number(f.birth.slice(0,4)),start=f.gxStartYear||String(Math.max(2012,p.gxSchemeYear||0,b+16)),r=records(f),count=Number(f.years);
 if(!Number.isInteger(count)||count<1||count>55)throw Error('请填写已交几年');
 const paidThisYear=['yes','no'].includes(f.paidThisYear)?f.paidThisYear:r.map.size===count?(r.map.has(a)?'yes':'no'):'yes';
 const complete=r.map.size===count&&(paidThisYear==='yes')===r.map.has(a),selected=[...r.map.keys()];
 // With only a year count, use a visible recent-years assumption for a draft.
 // Preserve every known year; never claim the inferred years are queried records.
 for(let y=paidThisYear==='yes'?a:a-1;!complete&&selected.length<count&&y>=Number(start);y--)if(!selected.includes(y))selected.push(y);
 if(selected.length!==count)throw Error('当前参考范围不足以匹配已交年数，请核对可补起点或历史记录');
 return {start,complete,inferred:!complete,currentAssumed:!['yes','no'].includes(f.paidThisYear)&&r.map.size!==count,paidThisYear,selected,annual:f.pastMonthly?'':String(f.pastAnnual||200),amountAssumed:!f.pastAnnual,years:Array.from({length:Math.max(0,a-Number(start)+1)},(_,i)=>({year:Number(start)+i,selected:selected.includes(Number(start)+i)}))};
}
function build(f,p,{mode='TO_SIXTY',selected,annual,currentSubsidy,tier=p.tiers[p.tiers.length-1],futureTier=tier,targets={}}={}){
 if(!['TO_SIXTY','NOW'].includes(mode))throw Error('请选择到60岁交够或现在补够');
 tier=Number(tier);futureTier=Number(futureTier);
 if(!p.tiers.includes(tier)||!p.tiers.includes(futureTier))throw Error('请选择当地允许的年缴档次');
 const config=setup(f,p);f={...f,paidThisYear:config.paidThisYear};
 const r=records(f,selected===undefined&&!config.complete?config.selected:selected,annual===undefined?config.annual:annual);if(!r.complete)throw Error('已匹配年份与已交年数或今年缴费不符，请修改参考年份');
 const segments=groups(r.map),base={...f,birth:f.ageOnly?String(Number(f.asOf.slice(0,4))-Number(f.age))+f.asOf.slice(4):f.birth,gxStartYear:config.start,historyMode:'segments',segments,payUntil:'MINIMUM',gxTransitionEnabled:'no',gxTransitionReviewed:'unknown',approvedPlan:null};
 const plan=planner.build(base,[],200,p);if(plan.error)throw Error(plan.error);
 const need=mode==='NOW'?Math.max(0,15-Number(f.years)):planner.suggest(base,p).needed;
 const available=plan.years.filter(x=>!x.paid).map(x=>x.year).sort((a,b)=>b-a);if(available.length<need)throw Error('可用漏缴年份不足，请先核对可补起点；不会虚构年份补足');
 const missing=planner.build(base,available.slice(0,need),'MAX',p),rows=[],editable=[],asYear=Number(f.asOf.slice(0,4));let subsidyReference=false,subsidyUsed=null;
 const pick=(year,original)=>{const allowed=tiersForYear(year).filter(v=>v>=original);const target=Object.prototype.hasOwnProperty.call(targets,year)?Number(targets[year]):Math.max(original,...allowed.filter(v=>v<=tier));if(!allowed.includes(target))throw Error(year+'年请按原年度档次选择，不能低于已交金额');editable.push({year,original,target,allowed,index:allowed.indexOf(target),labels:allowed.map(v=>v+'元')});return target;};
 for(const year of missing.selected){rows.push({mode:'missing',start:String(year),end:String(year),target:pick(year,0)});}
 for(const [year,original]of r.map){const target=pick(year,original);if(original===target)continue;const row={mode:'upgrade',start:String(year),end:String(year),original,target};
  if(year===asYear){const previous=(f.gxMakeupRows||[]).find(x=>x.mode==='upgrade'&&Number(x.start)<=year&&Number(x.end)>=year);const entered=currentSubsidy!==undefined?currentSubsidy:previous&&previous.subsidyAlready;
   if(entered!==undefined&&entered!==''&&!amount(entered))throw Error('请核对今年已经享受的补贴');
   subsidyReference=entered===undefined||entered==='';subsidyUsed=subsidyReference?p.subsidies[p.tiers.indexOf(original)]:Number(entered);if(subsidyUsed==null)throw Error('请填今年原档已享受的补贴');row.subsidyAlready=subsidyUsed;
  }rows.push(row);
 }
 for(const year of Object.keys(targets))if(!editable.some(x=>String(x.year)===year))throw Error('调整的年份不在当前方案中，请重新选择');
 return {form:{...base,tier:futureTier,gxMakeupRows:rows,gxScopeReviewed:'unknown'},editable:editable.sort((a,b)=>a.year-b.year),inferred:config.inferred,currentAssumed:config.currentAssumed,rows,addedYears:missing.count,upgradedYears:rows.filter(x=>x.mode==='upgrade').length,subsidyUsed,subsidyReference,mode};
}
module.exports={setup,build};
