// 桂人社规〔2023〕2号及其原始附件。只计算明确年度，不由年龄倒推补缴资格。
const D=require('../../vendor/decimal');
const early=[100,200,300,400,500,600,700,800,900,1000];
const current=[200,300,400,500,600,700,800,900,1000,1500,2000,3000,4000,5000,6000];
function tiersForYear(year){year=Number(year);if(!Number.isInteger(year)||year<2010||year>2100)return [];return year<2014?early.slice():year<2019?[...early,1500,2000]:current.slice();}
function tiersForRange(start,end){if(!/^\d{4}$/.test(String(start))||!/^\d{4}$/.test(String(end))||Number(start)>Number(end)||Number(start)<2010||Number(end)>2100)return [];let tiers=tiersForYear(start);for(let y=Number(start)+1;y<=Number(end);y++)tiers=tiers.filter(v=>tiersForYear(y).includes(v));return tiers;}
function amount(value,label){if(!/^\d+(\.\d{1,2})?$/.test(String(value))||new D(value).gt(100000000))throw Error('请检查'+label);return new D(value);}
function calculate(f,context){
 const rows=f.gxMakeupRows||[];
 if(!Array.isArray(rows)||rows.length>20)throw Error('补缴记录最多填写20段');
 const empty={cost:new D(0),subsidy:new D(0),addedYears:0,upgradedYears:0,entries:[]};
 if(!rows.length)return empty;
 const {policy,years,asYear,birthYear,opening,historical,estimated}=context;
 if(policy.rule!=='GUANGXI_ORDINARY')throw Error('本地区不能使用广西历史补缴方案，请清除补缴记录');
 if(f.gxReviewed!=='yes')throw Error('请先核对可补起始年度及各年原缴费记录');
 if(!/^\d{4}$/.test(String(f.gxStartYear))||Number(f.gxStartYear)<2010||Number(f.gxStartYear)>asYear)throw Error('请填写经办确认的可补起始年度（本页支持2010年起）');
 const earliest=Math.max(Number(f.gxStartYear),birthYear+16),seen=new Set(),known=new Map();
 if(f.historyMode==='segments')for(const r of f.segments||[])for(let y=Number(r.start);y<=Number(r.end);y++)known.set(y,new D(r.annual));
 let cost=new D(0),subsidy=new D(0),original=new D(0),addedYears=0,upgradedYears=0;const entries=[];
 for(const row of rows){
  if(!row||typeof row!=='object'||Array.isArray(row))throw Error('请核对补缴记录');
  if(!['missing','upgrade'].includes(row.mode))throw Error('请选择补未缴年份或提高已缴档次');
  if(!/^\d{4}$/.test(String(row.start))||!/^\d{4}$/.test(String(row.end))||Number(row.start)>Number(row.end)||Number(row.start)<earliest||Number(row.end)>asYear)throw Error('补缴年度不能早于可补起点、16岁或晚于当前年度');
  const target=amount(row.target,'补缴目标年档'),prior=row.mode==='upgrade'?amount(row.original,'原年缴金额'):new D(0);
  if(row.mode==='upgrade'&&!target.gt(prior))throw Error('提高档次须高于原年缴金额');
  for(let year=Number(row.start);year<=Number(row.end);year++){
   if(seen.has(year))throw Error('同一年度不能重复补缴或提档，请合并为一条记录');seen.add(year);
   const tiers=tiersForYear(year);
   if(!tiers.includes(target.toNumber())||row.mode==='upgrade'&&!tiers.includes(prior.toNumber()))throw Error(year+'年的原档或目标档不符合该年度档次，请拆分年份重新选择');
   if(row.mode==='missing'){
    if(year===asYear)throw Error('今年未缴请在今年缴费中选择，不重复作为历史断缴');
    if(known.has(year))throw Error(year+'年已在历史缴费中，不能再补作未缴年度');addedYears++;
   }else{
    if(known.size&&(!known.has(year)||!known.get(year).eq(prior)))throw Error(year+'年原金额与已填历史缴费记录不一致');
    if(year===asYear&&f.paidThisYear!=='yes')throw Error('提高今年档次前，今年缴费必须已包含在年数中');
    original=original.plus(prior);upgradedYears++;
   }
   let grant=new D(0);
   if(year===asYear&&row.mode==='upgrade'){
    const already=amount(row.subsidyAlready,'今年原档已享受的补贴');
    const credit=policy.subsidies[policy.tiers.indexOf(target.toNumber())];
    grant=D.max(0,new D(credit).minus(already));
   }
   const delta=target.minus(prior);cost=cost.plus(delta);subsidy=subsidy.plus(grant);
   entries.push({year,mode:row.mode,original:prior.toFixed(2),target:target.toFixed(2),cost:delta.toFixed(2),subsidy:grant.toFixed(2)});
  }
 }
 if(upgradedYears>years)throw Error('提档年数不能超过已经缴过的年数');
 if(f.paidThisYear==='yes'&&!seen.has(asYear)&&upgradedYears>years-1)throw Error('今年已含在年数中，所填历史提档超过其余已缴年数，请核对年份');
 if(estimated&&upgradedYears===years&&years>0&&!original.eq(historical))throw Error('全部已缴年份的原金额与历史总额不一致，请按原缴费修改');
 if(original.gt(estimated?historical:opening))throw Error('这些原缴费金额超过已填历史总额或账户金额，请核对');
 const possible=asYear-(birthYear+16)+(f.paidThisYear==='yes'?1:0);
 if(years+addedYears>possible)throw Error('补缴年数加上已缴年数超过可参保的实际年份，请核对年数');
 return {cost,subsidy,addedYears,upgradedYears,entries:entries.sort((a,b)=>a.year-b.year)};
}
module.exports={calculate,tiersForYear,tiersForRange};
