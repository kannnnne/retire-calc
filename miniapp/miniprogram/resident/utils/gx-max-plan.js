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
 if(f.historyUncertain||f.paidThisYear==='unknown')throw Error('请先填清已交年数和今年是否已缴，再配补缴方案');
 if(f.gxTransitionEnabled==='yes'||f.approvedPlan)throw Error('请先取消原核定补足方案，再比较历史年度补缴');
 const a=Number(f.asOf.slice(0,4)),b=f.ageOnly?a-Number(f.age):Number(f.birth.slice(0,4)),start=f.gxStartYear||String(Math.max(2012,p.gxSchemeYear||0,b+16)),r=records(f);
 return {start,complete:r.complete,selected:[...r.map.keys()],annual:f.pastMonthly?'':String(f.pastAnnual||''),years:Array.from({length:Math.max(0,a-Number(start)+1)},(_,i)=>({year:Number(start)+i,selected:r.map.has(Number(start)+i)}))};
}
function build(f,p,{mode='TO_SIXTY',selected,annual,currentSubsidy}={}){
 if(!['TO_SIXTY','NOW'].includes(mode))throw Error('请选择到60岁交够或现在补够');
 const config=setup(f,p),r=records(f,selected,annual);if(!r.complete)throw Error('请点齐已交的'+f.years+'个年份，并核对今年是否已含');
 const segments=groups(r.map),base={...f,gxStartYear:config.start,historyMode:'segments',segments,payUntil:'MINIMUM',gxTransitionEnabled:'no',gxTransitionReviewed:'unknown',approvedPlan:null};
 const plan=planner.build(base,[],200,p);if(plan.error)throw Error(plan.error);
 const need=mode==='NOW'?Math.max(0,15-Number(f.years)):planner.suggest(base,p).needed;
 const available=plan.years.filter(x=>!x.paid).map(x=>x.year).sort((a,b)=>b-a);if(available.length<need)throw Error('可用漏缴年份不足，请先核对可补起点；不会虚构年份补足');
 const missing=planner.build(base,available.slice(0,need),'MAX',p),rows=[...missing.rows],asYear=Number(f.asOf.slice(0,4));let subsidyReference=false,subsidyUsed=null;
 for(const [year,original]of r.map){const tiers=tiersForYear(year),target=tiers[tiers.length-1];if(original===target)continue;const row={mode:'upgrade',start:String(year),end:String(year),original,target};
  if(year===asYear){const previous=(f.gxMakeupRows||[]).find(x=>x.mode==='upgrade'&&Number(x.start)<=year&&Number(x.end)>=year);const entered=currentSubsidy!==undefined?currentSubsidy:previous&&previous.subsidyAlready;
   if(entered!==undefined&&entered!==''&&!amount(entered))throw Error('请核对今年已经享受的补贴');
   subsidyReference=entered===undefined||entered==='';subsidyUsed=subsidyReference?p.subsidies[p.tiers.indexOf(original)]:Number(entered);if(subsidyUsed==null)throw Error('请填今年原档已享受的补贴');row.subsidyAlready=subsidyUsed;
  }rows.push(row);
 }
 return {form:{...base,tier:p.tiers[p.tiers.length-1],gxMakeupRows:rows,gxScopeReviewed:'unknown'},rows,addedYears:missing.count,upgradedYears:rows.filter(x=>x.mode==='upgrade').length,subsidyUsed,subsidyReference,mode};
}
module.exports={setup,build};
