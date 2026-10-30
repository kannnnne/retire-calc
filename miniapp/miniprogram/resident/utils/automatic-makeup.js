// Default calculation scenarios, not persisted payment records or approval records.
const D=require('../../vendor/decimal'),rules=require('../../utils/resident-makeup-policies');
const {tiersForYear}=require('./gx-makeup');
function build(f,p,{birth,asOf,years}){
 if(f.autoMakeup!=='yes'||f.approvedPlan||f.gxTransitionEnabled==='yes'||(f.gxMakeupRows||[]).length||years>=15)return null;
 const nowYear=Math.floor(asOf/12),birthYear=Math.floor(birth/12),first=nowYear+(f.paidThisYear==='yes'?1:0);
 if(p.rule==='GUANGXI_ORDINARY'){
  const normal=Math.max(0,Math.max(nowYear,birthYear+60)-first+1),needed=Math.max(0,15-years-normal);
  if(!needed)return null;
  const start=Math.max(2012,p.gxSchemeYear||0,Number(f.gxStartYear)||0,birthYear+16),paid=new Set();
  if(f.historyMode==='segments')for(const row of f.segments||[])for(let y=Number(row.start);y<=Number(row.end);y++)paid.add(y);
  let missingRecords=Math.max(0,years-(f.paidThisYear==='yes'?1:0)-[...paid].filter(y=>y<nowYear).length);
  for(let y=nowYear-1;y>=start&&missingRecords;y--)if(!paid.has(y)){paid.add(y);missingRecords--;}
  const selected=[];for(let y=nowYear-1;y>=start&&selected.length<needed;y--)if(!paid.has(y))selected.push(y);
  if(!selected.length)return null;
  selected.sort((a,b)=>a-b);
  return {route:'GX_MISSING',addedYears:selected.length,title:'补往年＋正常缴费',summary:'已按可补往年配好，历史年度按各年档次上限计算。',years:selected,
   entries(annual){return selected.map(year=>{const tiers=tiersForYear(year),options=tiers.filter(v=>v<=annual),target=options[options.length-1]||tiers[0];return {year,mode:'missing',cost:new D(target).toFixed(2),target:new D(target).toFixed(2),original:'0.00',subsidy:'0.00'};});}};
 }
 const rule=rules.get(f.regionId,p.rule);if(!rule||p.lumpAt60||p.lumpAt65)return null;
 if(rule.modes.includes('lump')){
  const at=Math.max(asOf,birth+720),end=rule.validThrough;
  if(end&&Math.floor(at/12)*100+(at%12+1)>Number(end.replace('-','')))return null;
  return {sources:rule.sources,route:'AT60',addedYears:0,title:'到龄补足方案',summary:'到龄不足15年，按当地办法补足后领取。',policyPatch:{lumpAt60:true,lumpAt65:false},entries:()=>[]};
 }
 if(rule.modes.includes('extension')){
  const elapsed=Math.max(0,nowYear-birthYear-60+(f.paidThisYear==='yes'?1:0)),known=new Set();if(f.historyMode==='segments')for(const row of f.segments||[])for(let y=Number(row.start);y<=Number(row.end);y++)if(y>=birthYear+60&&y<=nowYear)known.add(y);const paid=Math.min(f.historyMode==='segments'?known.size:years,elapsed,rule.extensionYears),remaining=rule.extensionYears-paid;
  let before=0;while(before<60&&Math.max(asOf,(first+before)*12+asOf%12)<birth+720)before++;
  const last=first+before+remaining-1,at=Math.max(asOf,birth+rule.lumpAge*12,asOf+remaining*12,remaining?last*12+asOf%12:asOf);
  return {sources:rule.sources,route:'EXTENSION',addedYears:0,title:'延缴后补足方案',summary:'按规定延缴后，剩余年限一次补足。',policyPatch:{lumpAt60:false,lumpAt65:true,lumpAtMonth:at,includeNormalAtLump:remaining>0,normalYearsCap:before+remaining},entries:()=>[]};
 }
 return null;
}
function cost(entries){return entries.reduce((sum,row)=>sum.plus(row.cost),new D(0));}
module.exports={build,cost};
