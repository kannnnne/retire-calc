const brand=require('./brand');
const routes={home:'/pages/home/home',employee:'/pages/index/index',flexible:'/flexible/pages/calc/calc',resident:'/resident/pages/home/home'};
const labels={home:'养老计算',employee:'职工养老',flexible:'灵活就业养老',resident:'城乡居民养老'};
const copy={home:['为往后的日子，','算一笔账。','什么时候领 · 每月约多少 · 接下来怎么交'],employee:['上班交的养老，','算清楚再规划。','估算领取时间、每月金额和后续个人费用'],flexible:['离职后自己交，','先算清这笔预算。','已有年限接着算，对比以后怎么交'],resident:['给家人的养老，','留一份明白的安排。','比较年缴安排、预计待遇与当地条件参考']};
let pending=null;
const clean=v=>String(v==null?'':v);
const money=v=>{const n=Number(clean(v).replace(/,/g,''));return Number.isFinite(n)?Math.round(n).toLocaleString('en-US'):'—';};
function recommendation(kind='home'){if(!routes[kind])kind='home';return {kind,brand:brand.name,type:labels[kind],title:copy[kind].slice(0,2),description:copy[kind][2],path:routes[kind]};}
function duration(months){const n=Number(months);if(!Number.isFinite(n)||n<0)return '待核对';return Math.floor(n/12)+'年'+(n%12?n%12+'个月':'');}
function ageAt(birth,at){if(!/^\d{4}-\d{2}$/.test(birth||'')||!/^\d{4}-\d{2}$/.test(at||''))return '';const [by,bm]=birth.split('-').map(Number),[y,m]=at.split('-').map(Number),n=(y-by)*12+m-bm;if(n<0)return '';return Math.floor(n/12)+'岁'+(n%12?n%12+'个月':'');}
function profile(kind,data){const r=data.result||{},f=data.form||{},resident=kind==='resident',at=f.dataAsOf||f.asOf,age=resident?(f.ageOnly?f.age+'岁':ageAt(f.birth,at)):ageAt(f.birthMonth,at),paid=resident?(r.paidYears==null?f.years:r.paidYears)+'年':duration(kind==='flexible'?r.history&&r.history.total:f.paidMonths),account=resident?r.openingAmount:r.accountPrincipal;
 const facts=[{label:'当前年龄',value:age||'待核对'},{label:'累计已交',value:paid}];
 facts.push({label:resident?'当前账户'+(r.estimated?'（估算）':''):kind==='employee'?'账户本金'+(r.estimatedAccount?'（估算）':''):'账户余额'+(r.estimatedAccount?'（估算）':''),value:account==null||account===''?'待查询':money(account)+' 元'});
 if(!resident)facts.push({label:'参保情况',value:kind==='employee'?(f.category==='MALE'?'男性':'女性')+' · 单位在职':r.history?'单位'+duration(r.history.unit)+'／自己'+duration(r.history.flex):'灵活就业'});
 if(resident&&r.pastPaid!=null)facts.push({label:'历史自费',value:money(r.pastPaid)+' 元'});
 if(kind==='employee'&&Number(f.interest)>0)facts.push({label:'另计账户利息',value:money(f.interest)+' 元'});
 return facts;
}
function fromPage(kind,data){
 const base=recommendation(kind),r=data.result,s=r&&r.chosen;if(!s)return {...base,personal:null};
 let personal=null;
 if(kind==='employee'||kind==='flexible'){
  if(s.qualified&&!s.unsupported)personal={region:clean(r.region),monthly:clean(s.monthly),receipt:clean(s.receiptMonth),rows:[{label:'后续个人缴费',value:money(s.futurePersonalCost)+' 元',sensitive:true},{label:'还需缴费',value:clean(s.years)},{label:'自己每月交',value:money(s.monthlyPersonalPayment)+' 元',sensitive:true}],notes:[s.name?'交法：'+clean(s.name):'',r.retirement&&s.lastPaymentMonth>r.retirement.month?'到龄后仍需延缴，资格与起领时间须核对。':'',kind==='employee'?'费用只计个人承担部分，不含单位缴费。':'费用为自己承担的养老费，不含医保。',r.estimatedAccount?'账户使用估算，未还原历年变化与利息。':'',r.parameter?'计发参考参数：'+r.parameter.year+'年。':'',r.referenceNote?'按已录入参数作情景参考，未计未来调整。':'',...(r.warnings||[]).filter(x=>/待核对|待确认|在藏|明显偏低|2022|资格|延缴/.test(x)),'历史指数未知按0.6估算，结果以社保核定为准。']};
 }else if(kind==='resident'&&!data.planning&&!data.referencePlan&&!data.planIllustration){
  const d=data.display||{},p=d.payback||{},t=s.timeline||{};
  personal={region:clean(r.region||data.region&&data.region.name),monthly:clean(d.monthly),receipt:clean(s.receiptMonth||s.receiptYear&&s.receiptYear+'年'),rows:[{label:'还需交',value:(p.futureAmount||money(s.total))+' 元',sensitive:true},{label:p.totalLabel||'本次合计',value:(p.totalAmount||money(s.total))+' 元',sensitive:true},{label:'后续正常年缴',value:money(s.annual)+' 元／年 · '+clean(t.normalYears)+'年',sensitive:true}],notes:[p.totalNote,p.known?p.label+'：领取后'+p.text+'；按总月领抵回所计费用，不是新增收益。':'',r.referenceLabel,data.form&&data.form.ageOnly?'起领年份按年龄估算，准确月份需补出生年月。':'',data.form&&data.form.accountMode==='estimate'?'账户采用估算，历史金额不代表查询记录。':'','涉及补缴的资格、档次及办理须当地确认。','未计未来利息及年度普调，以社保核定为准。']};
 }
 if(personal&&kind==='resident'&&r.autoPlan){personal.planName=r.autoPlan.title;if(Number(s.immediateCost)>0)personal.rows.push({label:'现在补交',value:money(s.immediateCost)+' 元'+(s.automaticMakeup?' · '+s.automaticMakeup.addedYears+'年':'')});}
 if(personal&&kind==='resident'){const guide=require('../resident/utils/receipt-guidance').guidance(r);if(guide)personal.planName=guide.planName;}
 if(personal&&kind==='resident'&&s.ageIncreaseSummary)personal.rows.push({label:'到龄加发',value:s.ageIncreaseSummary.replace(/；/g,'\n')});
 if(personal){personal.facts=profile(kind,data);const receiptAge=kind==='resident'?s.timeline&&s.timeline.receivingAge&&s.timeline.receivingAge+'岁':ageAt(data.form.birthMonth,personal.receipt);personal.receiptAge=receiptAge||'';if(kind!=='resident'){personal.rows.push({label:'缴费截至',value:clean(s.lastPaymentMonth)});personal.planName=s.name||'';}if(kind==='resident'&&personal.rows.length>1&&personal.rows[0].value===personal.rows[1].value)personal.rows.splice(1,1);personal.asOf=clean(data.form&&(data.form.dataAsOf||data.form.asOf));if(kind==='resident'&&s.lumpYears)personal.rows.push({label:clean(s.timeline&&s.timeline.lumpAge)+'岁时补',value:money(s.lumpCost)+' 元 · '+s.lumpYears+'年',sensitive:true});personal.isDemo=!!data.isDemo;personal.notes.unshift('测算截至 '+clean(data.form&&(data.form.dataAsOf||data.form.asOf)),data.isDemo?'示例数据，不是个人核定结果。':'');personal.notes=[...new Set(personal.notes.filter(Boolean).map(clean))];if(!personal.receipt||!Number.isFinite(Number(personal.monthly))||Number(personal.monthly)<=0)personal=null;}
 return {...base,personal};
}
function open(kind,data,wx){pending=fromPage(kind,data||{});wx.navigateTo({url:'/pages/share/share'});}
function openComparison(payload,wx){pending={...recommendation('resident'),...payload};wx.navigateTo({url:'/pages/share/share'});}
function take(){const p=pending;pending=null;return p||recommendation();}
function share(kind){const p=recommendation(kind);return {title:p.brand+' · '+p.type,path:p.path+'?from=friend'};}
function model(payload,mode='recommend',reveal=false){
 const p=mode==='personal'?payload.personal:null;
 return {brand:payload.brand,type:payload.type,kind:payload.kind,personal:!!p,asOf:p?p.asOf:'',title:p?(p.isDemo?['这是一份养老','方案示例。']:['岁月有数，','未来从容。']):payload.title,description:payload.description,region:p?p.region:'按地区选择适用规则',monthly:p?(reveal?money(p.monthly):'****'):null,monthlyLabel:p&&p.rows.some(x=>x.label==='到龄加发')?'起领时每月领取':'预计每月领取',receipt:p?p.receipt:'',receiptAge:p?p.receiptAge:'',facts:p?p.facts||[]:[],planName:p?p.planName:'',rows:p?p.rows.map(x=>({...x})):[],notes:p?p.notes.filter(x=>reveal||!x.includes('回本')):['免费计算 · 无需登录','输入在手机本地计算，不上传、不保存。','各地政策和个人条件不同，结果仅供参考。'],cta:'长按识别小程序码，算算自己的情况'};
}
module.exports={recommendation,fromPage,open,openComparison,take,share,model,routes};
