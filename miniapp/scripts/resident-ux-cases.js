// Repeatable page-event walkthrough, not a WeChat renderer or real-person study.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),file=path.join(root,'miniprogram/resident/pages/calc/calc.js');
const cases=[
 {id:'G01',age:35,years:5,annual:200,title:'年轻人：35岁，交5年，200元档'},
 {id:'G02',age:55,years:5,annual:200,title:'55岁，只记得交5年、每年200'},
 {id:'G03',age:59,years:5,annual:200,title:'59岁临近领取，5年低档'},
 {id:'G04',age:60,years:4,annual:200,title:'60岁，交4年，有漏缴但不知道哪年'},
 {id:'G05',age:60,years:14,annual:200,title:'60岁差1年，今年已含'},
 {id:'G06',age:60,years:15,annual:200,title:'60岁已经交满15年'},
 {id:'G07',age:65,years:5,annual:200,title:'65岁，只交5年，还没领'},
 {id:'G08',age:60,years:0,annual:200,never:true,title:'60岁从未参保'},
 {id:'G09',age:60,years:4,annual:300,rough:true,title:'60岁农村女性，记得三四年、三四百元'},
 {id:'G10',birth:'1967-11',years:5,annual:200,segments:[['2021','2021','200'],['2023','2026','200']],title:'真实年份样例：漏2022，2021和2023至2026各200'},
 {id:'G11',age:60,years:9,annual:200,segments:[['2012','2013','1000'],['2017','2018','2000'],['2021','2021','200'],['2023','2026','6000']],title:'早年高档、断缴、近年6000，混合9年'},
 {id:'G12',age:59,years:5,annual:333,title:'59岁，以前年缴平均333，不是现行标准档'},
 {id:'G13',age:60,years:5,annual:6000,title:'60岁已有5年最高档，不应再次收费'},
 {id:'G14',age:17,years:1,annual:200,title:'17岁新参保，200元交1年'},
 {id:'G15',age:59,years:5,annual:200,paid:'no',title:'59岁，5年低档，今年还没交'},
 {id:'G16',age:59,years:5,annual:200,paid:'unknown',title:'59岁，5年低档，不确定今年算不算'},
 {id:'G17',age:59,years:5,annual:200,monthly:'16.67',title:'按月记忆：每月16.67元，交5年'},
 {id:'G18',age:65,years:15,annual:200,receiving:'yes',title:'65岁已经领取，想看能否提高'},
 {id:'G19',age:60,years:5,annual:200,balance:'5000',title:'60岁知道个人账户5000元、交5年'}
];
function page(){let def;const store={},trace=[];vm.runInNewContext(fs.readFileSync(file,'utf8'),{Date,JSON,Page:v=>def=v,wx:{pageScrollTo(){},hideKeyboard(){},showModal(v){trace.push({modal:v.title,content:v.content});}},require:id=>id.endsWith('/session')?{load:k=>store[k],save:(k,v)=>store[k]=JSON.parse(JSON.stringify(v))}:require(path.resolve(path.dirname(file),id))});
 const q={...def,data:JSON.parse(JSON.stringify(def.data)),setData(patch){for(const [k,v]of Object.entries(patch)){const keys=k.split('.');let target=this.data;for(const key of keys.slice(0,-1))target=target[key];target[keys[keys.length-1]]=v;}}};
 const call=(name,arg)=>{trace.push({action:name});q[name](arg);};call('onLoad');return {q,call,trace};}
function snapshot(q){const r=q.data.result,s=r&&r.chosen,t=s&&s.timeline;return {error:q.data.error,view:q.data.recordHelp?'查记录':q.data.quickPlan?'补缴预览':q.data.planning?'逐年手填':r?'结果':'填写',monthly:q.data.display&&q.data.display.monthly,receivingAge:t&&t.receivingAge,receipt:s&&(s.receiptMonth||s.receiptYear),normalYears:t&&t.normalYears,total:s&&s.total,historyUncertain:q.data.form.historyUncertain,scopeReviewed:q.data.form.gxScopeReviewed};}
function run(c){const {q,call,trace}=page(),input=(key,value)=>call('input',{currentTarget:{dataset:{key}},detail:{value:String(value)}}),choice=(key,value)=>call('choice',{currentTarget:{dataset:{key,value}}});
 call('regionChoice',{detail:{regionId:'450800'}});input('asOf','2026-10');if(c.birth){call('ageMode',{currentTarget:{dataset:{value:'birth'}}});input('birth',c.birth);}else input('age',c.age);
 call('history',{currentTarget:{dataset:{value:c.never?'never':'paid'}}});if(!c.never){input('years',c.years);const index=q.data.pastTiers.indexOf(c.annual);if(index>=0)call('pastTier',{detail:{value:index}});else{call('pastTier',{detail:{value:q.data.pastTiers.length}});input('pastAnnual',c.annual);}choice('paidThisYear',c.paid||'yes');}
 choice('receiving',c.receiving||'no');
 if(c.monthly){call('pastPeriod',{detail:{value:1}});input('pastAnnual',c.monthly);}
 if(c.balance){call('accountMode',{currentTarget:{dataset:{value:'balance'}}});input('balance',c.balance);}
 if(c.segments){call('historyMode',{currentTarget:{dataset:{value:'segments'}}});c.segments.forEach((values,index)=>{if(index)call('addSegment');['start','end','annual'].forEach((key,i)=>call('segmentInput',{currentTarget:{dataset:{index,key}},detail:{value:values[i]}}));});}
 if(c.rough){call('historyCertainty',{currentTarget:{dataset:{value:'rough'}}});for(const[key,value]of Object.entries({roughYearsMin:'3',roughYearsMax:'4',roughAnnualMin:'300',roughAnnualMax:'400'}))call('roughInput',{currentTarget:{dataset:{key}},detail:{value}});}
 call('calculate');const ordinary=snapshot(q),before=JSON.stringify(q.data.form);call('openSupplementPlans');const route=snapshot(q),quick=q.data.quickPlan;let preview=null,modified=null,afterCancel=null,unconfirmed=null;
 if(quick){preview={error:quick.error,summary:quick.summary,options:quick.options,inferred:quick.config.inferred,assumedPaidYears:quick.selected,confirmation:quick.confirmed};call('applyMaxPlan');unconfirmed={error:q.data.quickPlan&&q.data.quickPlan.error,originalUnchanged:before===JSON.stringify(q.data.form)};
 if(quick.options&&quick.options.length){call('quickChoice',{currentTarget:{dataset:{tier:1000}}});const selected=q.data.quickPlan.summary;call('quickDetails');if(q.data.quickPlan.draft){const row=q.data.quickPlan.draft.editable.find(v=>v.original>0&&v.target>v.original);if(row)call('quickTarget',{currentTarget:{dataset:{year:row.year}},detail:{value:row.allowed.indexOf(row.original)}});}modified={selectedMonthly:selected&&selected.monthly,afterEditMonthly:q.data.quickPlan.summary&&q.data.quickPlan.summary.monthly,error:q.data.quickPlan.error};}
 call('cancelMaxPlan');afterCancel={...snapshot(q),originalUnchanged:before===JSON.stringify(q.data.form)};}
 return {id:c.id,title:c.title,inputs:c,ordinary,route,preview,unconfirmed,modified,afterCancel,trace,externalLookupsByScript:0};}
function audit(){const results=cases.map(c=>{try{return run(c);}catch(e){return {id:c.id,title:c.title,runnerError:e.stack};}}),safetyFailures=results.filter(c=>c.runnerError||c.unconfirmed&&!c.unconfirmed.originalUnchanged||c.afterCancel&&!c.afterCancel.originalUnchanged||c.preview&&c.preview.confirmation===true).map(c=>c.id);return {version:require('../package.json').version,method:'Node VM executes page event handlers; WXML/CSS inspected separately; no rendered GUI, phone, actual resident or policy approval',safetyFailures,cases:results};}
if(require.main===module){const report=audit(),out=path.join(root,'output/resident-ux-cases.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report.cases.map(x=>({id:x.id,title:x.title,ordinary:x.ordinary,route:x.route,quickError:x.preview&&x.preview.error,quickMonthly:x.preview&&x.preview.summary&&x.preview.summary.monthly,options:x.preview&&x.preview.options.map(v=>v.monthly),cancel:x.afterCancel&&x.afterCancel.originalUnchanged,runnerError:x.runnerError})),null,2));if(report.safetyFailures.length)process.exitCode=1;}
module.exports={audit,cases};
