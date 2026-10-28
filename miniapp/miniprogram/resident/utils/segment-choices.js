// Historical tiers are shown only where the project already has year-specific rules.
const {tiersForRange}=require('./gx-makeup');
function choices(form,region){
 const current=Number(String(form.asOf).slice(0,4)),birth=form.ageOnly?current-Number(form.age):Number(String(form.birth).slice(0,4));
 const first=Math.max(1951,Number.isFinite(birth)?birth+16:1951,region.rule==='GUANGXI_ORDINARY'?Math.max(2010,region.gxSchemeYear||0):1951);
 const years=Array.from({length:Math.max(0,current-first+1)},(_,i)=>String(current-i));
 return (form.segments||[]).map(row=>{
 const start=String(row.start||''),end=String(row.end||''),valid=/^\d{4}$/.test(start)&&/^\d{4}$/.test(end)&&Number(end)>=Number(start)&&Number(end)<=current;
 const historical=region.rule==='GUANGXI_ORDINARY',tiers=valid?(historical?tiersForRange(start,end):(region.tiers||[])):[];
 const manual=row.manual===true||!!row.annual&&!tiers.includes(Number(row.annual));
 return {...row,startValues:['',...years],startLabels:['开始年份',...years.map(y=>y+'年')],startIndex:Math.max(0,years.indexOf(start)+1),endValues:['',...years.filter(y=>!start||Number(y)>=Number(start))],endLabels:['结束年份',...years.filter(y=>!start||Number(y)>=Number(start)).map(y=>y+'年')],endIndex:Math.max(0,years.filter(y=>!start||Number(y)>=Number(start)).indexOf(end)+1),tiers,tierLabels:['选择年缴金额',...tiers.map(v=>v+'元／年'),'自己填写'],tierIndex:manual?tiers.length+1:Math.max(0,tiers.indexOf(Number(row.annual))+1),manual,historical};
 });
}
module.exports={choices};
