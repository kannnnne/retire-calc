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
 target=target==='MAX'?'MAX':tiers.includes(Number(target))?Number(target):tiers.includes(200)?200:tiers[0]||200;
 const values=[...tiers,'MAX'],labels=[...tiers.map(v=>v+'元／年'),'按各年份最高档'];let cost=new D(0);
 const rows=[];for(const y of chosen){const annual=target==='MAX'?tiersForYear(y)[tiersForYear(y).length-1]:target;cost=cost.plus(annual);const last=rows[rows.length-1];if(last&&Number(last.end)+1===y&&last.target===annual)last.end=String(y);else rows.push({mode:'missing',start:String(y),end:String(y),target:annual});}
 const recordYears=new Set();if(f.historyMode==='segments')for(const row of f.segments||[])for(let y=Number(row.start);y<=Number(row.end);y++)recordYears.add(y);
 const complete=['yes','no'].includes(f.paidThisYear)&&f.historyMode==='segments'&&recordYears.size===Number(f.years)&&(f.paidThisYear==='yes')===recordYears.has(end+1);
 return {years,selected:chosen,tiers,values,labels,tierIndex:Math.max(0,values.indexOf(target)),target,targetLabel:target==='MAX'?'按各年份最高档':target+'元／年',complete,count:chosen.length,cost:cost.toFixed(2),rows,error:''};
}
// This only drafts named years from complete records. It never approves them.
function suggest(f,policy={}){
 const plan=build(f,[],200,policy);if(plan.error)throw Error(plan.error);
 if(!plan.complete)throw Error('先按分年记录填清已经交过的年份，再自动选漏缴年份；也可以自己逐年点选');
 const a=Number(f.asOf.slice(0,4))*12+Number(f.asOf.slice(5))-1,b=f.ageOnly?a-Number(f.age)*12:Number(f.birth.slice(0,4))*12+Number(f.birth.slice(5))-1,sixty=b+720;
 const first=Math.floor(a/12)+(f.paidThisYear==='yes'?1:0);let normal=0;
 for(let y=first;y<=Math.floor(sixty/12);y++)if(Math.max(a,y*12+(policy.annualMonth?policy.annualMonth-1:a%12))<=sixty)normal++;
 const needed=Math.max(0,15-Number(f.years)-normal),available=plan.years.filter(x=>!x.paid).map(x=>x.year).sort((a,b)=>b-a);
 if(available.length<needed)throw Error('当前起点内的漏缴年份还不够，请向社保核对更早年份或其他补缴条件');
 return {selected:available.slice(0,needed),normalYears:normal,needed};
}
module.exports={build,suggest};
