const session=require('../../../utils/session');
const brand=require('../../../utils/brand');
const {forecast,retirement,minimum}=require('../../../utils/forecast');
const {dates,suggestedFirst,serial}=require('../../../utils/employee-inputs');
const {contributionRange}=require('../../../utils/input-model');
const inputs=require('../../../utils/flexible-inputs');
const plans=['CURRENT','MINIMUM','MINIMUM_STOP','CUSTOM'];
const planLabels=['照这个金额交到退休','最低档交到退休','最低档交够年限就停','自己选还交多久'];
const duration=n=>(Math.floor(n/12)?Math.floor(n/12)+'年':'')+(n%12?n%12+'个月':'')||(n===0?'0个月':'—');
const show=s=>({...s,name:planLabels[plans.indexOf(s.plan)],monthly:s.totalLow==null?'—':String(Math.round((Number(s.totalLow)+Number(s.totalHigh))/20)*10),years:duration(s.futureMonths),recovery:s.recoveryMonthsSlow==null?'—':duration(s.recoveryMonthsSlow)});
function defaults(){const bounds=dates();return {dateBounds:bounds,accountOpen:false,paymentOpen:false,advanced:false,compare:false,result:null,error:'',categoryIndex:0,categoryLabels:['男性（原60岁）','女性（原55岁）','女性（原50岁）'],planLabels,planIndex:0,accountMode:'estimate',historyModeIndex:0,baseModeIndex:0,baseModeLabels:['最低档','自填每月养老缴费','自填缴费基数'],baseInput:'',form:{birthMonth:bounds.defaultBirth,category:'MALE',firstInsuredMonth:suggestedFirst(bounds.defaultBirth,bounds.todayMonth),dataAsOf:bounds.todayMonth,unitYears:10,unitMonths:0,flexYears:2,flexMonths:0,unitPayment:'',flexPayment:'',principal:'',historicalIndex:'',historicalRights:false,pauseMonths:0,customMonths:60,plan:'CURRENT',contributionType:'FLEXIBLE',interest:0}};}
Page({
 data:defaults(),
 onLoad(){const saved=session.load('flexible');this.setData(saved||defaults());this.setData({dateBounds:dates()});this.refresh();},
 onUnload(){session.save('flexible',this.data);},
 refresh(){const f=this.data.form,limits=contributionRange(f.dataAsOf);let h=null,principal='',accountError='',historyError='',base='',baseError='';
  try{h=inputs.history(f);}catch(e){historyError=e.message;}
  try{if(h)principal=this.data.accountMode==='known'?inputs.amount(f.principal,'查询到的账户余额',true).toFixed(2):inputs.estimate(f,h,limits.min,this.data.historyModeIndex===1);}catch(e){accountError=e.message;}
  try{base=inputs.futureBase(this.data.baseModeIndex,this.data.baseInput,limits);}catch(e){baseError=e.message;}
  const effective=this.data.planIndex===1||this.data.planIndex===2?limits.min:base;
  let missing='';try{if(h)missing=duration(Math.max(0,minimum(Number(retirement(f.birthMonth,f.category).month.slice(0,4)))-h.total));}catch(e){}
  this.setData({minimumPayment:(limits.min*.2).toFixed(2),maximumPayment:(limits.max*.2).toFixed(2),limits,historySummary:h,historyError,accountError,accountPrincipal:principal,accountSummary:principal===''?'':Math.round(Number(principal)).toLocaleString('en-US'),base,baseError,futureBase:String(effective),futurePayment:effective===''?'':(Number(effective)*.2).toFixed(2),paidDuration:h?duration(h.total):'—',missingDuration:missing});
 },
 input(e){const k=e.currentTarget.dataset.key;if(!Object.prototype.hasOwnProperty.call(this.data.form,k))return;this.setData({['form.'+k]:e.detail.value,error:''});this.refresh();},
 category(e){const n=Number(e.detail.value);this.setData({categoryIndex:n,'form.category':['MALE','FEMALE_55','FEMALE_50'][n],error:''});this.refresh();},
 accountMode(e){this.setData({accountMode:e.currentTarget.dataset.value,error:''});this.refresh();},
 historyMode(e){this.setData({historyModeIndex:Number(e.detail.value),error:''});this.refresh();},
 baseMode(e){this.setData({baseModeIndex:Number(e.detail.value),baseInput:'',error:''});this.refresh();},
 baseInput(e){this.setData({baseInput:e.detail.value,error:''});this.refresh();},
 plan(e){const n=Number(e.detail.value);this.setData({planIndex:n,'form.plan':plans[n],error:''});this.refresh();},
 toggleSection(e){const k=e.currentTarget.dataset.section;if(['accountOpen','paymentOpen'].includes(k))this.setData({[k]:!this.data[k]});},
 toggle(){this.setData({advanced:!this.data.advanced});},compare(){this.setData({compare:!this.data.compare});},
 historyRights(e){this.setData({'form.historicalRights':e.detail.value,error:''});},
 calculate(){try{this.refresh();const d=this.data,f=d.form,b=serial(f.birthMonth),a=serial(f.dataAsOf),first=serial(f.firstInsuredMonth);
  if(b===null||f.birthMonth<d.dateBounds.birthStart||f.birthMonth>d.dateBounds.birthEnd)throw Error('请选择18至70岁的出生年月');
  if(a===null||f.dataAsOf>d.dateBounds.todayMonth)throw Error('数据截至月份不能晚于当前月份');
  if(first===null||first<b+16*12||first>a)throw Error('请在更多设置里核对首次缴费月份，应在16岁以后且不晚于截至月');
  if(d.historyError)throw Error(d.historyError);
  if(d.accountError){this.setData({accountOpen:true});throw Error(d.accountError);}
  if(d.baseError&&d.planIndex!==1&&d.planIndex!==2){this.setData({paymentOpen:true});throw Error(d.baseError);}
  const payload={...f,paidMonths:d.historySummary.total,principal:d.accountPrincipal,currentBase:d.planIndex===1||d.planIndex===2?String(d.limits.min):d.base,contributionType:'FLEXIBLE'};
  const r=forecast(payload),scenarios=r.scenarios.map(show);this.setData({result:{...r,scenarios,chosen:scenarios.find(s=>s.plan===f.plan),estimatedAccount:d.accountMode==='estimate',accountPrincipal:d.accountPrincipal,history:{...d.historySummary}},error:'',compare:false,advanced:false});session.save('flexible',this.data);wx.pageScrollTo({scrollTop:0,duration:200});
 }catch(e){this.setData({error:e.message,advanced:/首次|开始参保|最多|历史|特殊/.test(e.message)?true:this.data.advanced});wx.pageScrollTo({scrollTop:0,duration:200});}},
 choosePlan(e){const p=e.currentTarget.dataset.plan,s=this.data.result.scenarios.find(x=>x.plan===p);if(!s)return;this.setData({'form.plan':p,planIndex:plans.indexOf(p),'result.chosen':s});this.refresh();session.save('flexible',this.data);wx.pageScrollTo({scrollTop:0,duration:200});},
 edit(){this.setData({result:null,error:'',compare:false});session.save('flexible',this.data);wx.pageScrollTo({scrollTop:0,duration:0});},
 reset(){this.setData(defaults());this.refresh();session.save('flexible',this.data);wx.pageScrollTo({scrollTop:0,duration:0});},
 info(e){const texts={history:'单位和灵活就业的职工养老年限可以累计。同一个月只能算一次；不要填医保、居民养老或重复缴费年限。没有交过的那一项填0。',category:'女性退休类别受原身份、岗位和参保经历影响，不能只凭现在是灵活就业就选原50岁或原55岁。请按社保确认的类别选择。',account:'粤省事 → 社保·就业 → 养老 → 参保缴费状态查询 → 职工社保。单位和灵活就业使用同一个个人账户；查到含利息的余额可直接填，不要把累计缴费总额当余额。',rules:'广州灵活就业可在缴费基数上下限内自选，自己承担20%，其中基数的8%进入个人账户。通常不能补交过去断缴年限；到龄不够年限需按规定继续交。退休地、延缴资格和特殊补缴请向社保确认。'};wx.showModal({title:'怎么填？',content:texts[e.currentTarget.dataset.key]||'',showCancel:false});},
 policy(){wx.navigateTo({url:'/pages/policy/policy?id=flexible-rules'});},
 onShareAppMessage(){return {title:brand.name+' · 灵活就业养老',path:'/flexible/pages/calc/calc'};}
});
