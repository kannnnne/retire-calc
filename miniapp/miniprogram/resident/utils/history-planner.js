// Select actual missed years; never infer entitlement or missing years from age.
const {tiersForYear}=require('./gx-makeup');
const D=require('../../vendor/decimal');
function build(f,selected=[],target=200,policy={}){
 const end=Number(String(f.asOf||'').slice(0,4))-1;
 const birthYear=f.ageOnly?end+1-Number(f.age):Number(String(f.birth||'').slice(0,4));
 const start=Number(f.gxStartYear),error=!/^\d{4}$/.test(String(f.gxStartYear||''))||start<Math.max(2010,policy.gxSchemeYear||0,birthYear+16)||start>end?'请填经办确认的可补起始年（不含今年）':'';
 if(error)return {years:[],selected:[],tiers:[],labels:[],tierIndex:0,target:200,count:0,cost:'0.00',rows:[],error};
 const paid=new Set();if(f.historyMode==='segments')for(const r of f.segments||[])for(let y=Number(r.start);y<=Number(r.end);y++)paid.add(y);
 for(const r of f.gxMakeupRows||[])if(r.mode==='upgrade')for(let y=Number(r.start);y<=Number(r.end);y++)paid.add(y);
 const years=Array.from({length:end-start+1},(_,i)=>({year:start+i,paid:paid.has(start+i),selected:false}));
 const chosen=[...new Set(selected.map(Number))].filter(y=>years.some(x=>x.year===y&&!x.paid)).sort((a,b)=>a-b);
 for(const y of years)y.selected=chosen.includes(y.year);
 let tiers=chosen.length?tiersForYear(chosen[0]):[];
 for(const y of chosen)tiers=tiers.filter(v=>tiersForYear(y).includes(v));
 target=tiers.includes(Number(target))?Number(target):tiers.includes(200)?200:tiers[0]||200;
 const rows=[];for(const y of chosen){const last=rows[rows.length-1];if(last&&Number(last.end)+1===y)last.end=String(y);else rows.push({mode:'missing',start:String(y),end:String(y),target});}
 return {years,selected:chosen,tiers,labels:tiers.map(v=>v+'元／年'),tierIndex:Math.max(0,tiers.indexOf(target)),target,count:chosen.length,cost:new D(target).mul(chosen.length).toFixed(2),rows,error:''};
}
module.exports={build};
