const {recoveryYears}=require('../../../utils/recovery-display');
const indexRules=require('../../../utils/employee-index');
const cities=require('../../../utils/city-policies');
const session=require('../../../utils/session');
const brand=require('../../../utils/brand');
const {forecast,retirement,minimum}=require('../../../utils/forecast');
const {dates,suggestedFirst,serial}=require('../../../utils/employee-inputs');
const {contributionRange}=require('../../../utils/input-model');
const inputs=require('../../../utils/flexible-inputs');
const categoryRules=require('../../../utils/flexible-category');
const plans=['CURRENT','MINIMUM','MINIMUM_STOP','CUSTOM'];
const planLabels=['按此金额交到退休','最低档交到退休','交够年限就停','自选缴费月数'];
const duration=n=>(Math.floor(n/12)?Math.floor(n/12)+'年':'')+(n%12?n%12+'个月':'')||(n===0?'0个月':'—');
const show=s=>({...s,name:planLabels[plans.indexOf(s.plan)],monthly:s.totalLow==null?'—':String(Math.round((Number(s.totalLow)+Number(s.totalHigh))/20)*10),years:duration(s.futureMonths),recovery:recoveryYears(s.recoveryMonthsSlow)});
function defaults(){const bounds=dates();return {dateBounds:bounds,accountOpen:false,paymentOpen:false,advanced:false,compare:false,pendingPlan:null,result:null,error:'',categoryIndex:0,categoryLabels:['男性（原60岁）','女性（原55岁）','女性（原50岁）'],planLabels,planIndex:0,accountMode:'estimate',historyModeIndex:0,baseModeIndex:0,baseModeLabels:['最低档','自填每月养老缴费','自填缴费基数'],baseInput:'',form:{regionId:'440100',birthMonth:bounds.defaultBirth,category:'MALE',firstInsuredMonth:suggestedFirst(bounds.defaultBirth,bounds.todayMonth),dataAsOf:bounds.todayMonth,unitYears:10,unitMonths:0,flexYears:2,flexMonths:0,unitPayment:'',flexPayment:'',principal:'',historicalIndex:'',historicalRights:false,pauseMonths:0,customMonths:60,plan:'CURRENT',contributionType:'FLEXIBLE',interest:0}};}
Page({
 data:defaults(),
 onLoad(){const saved=session.load('flexible');this.setData(saved||defaults());if(saved&&saved.form.regionId==='440300'&&saved.form.szScopeConfirmed!=='yes')this.setData({result:null,compare:false});this.setData({dateBounds:dates()});this.refresh();},
 szScope(e){this.setData({'form.szScopeConfirmed':e.detail.value.length?'yes':'unknown',result:null,error:''});this.refresh();},
 regionChanged(e){const id=e.detail.regionId;if(!cities.city(id))return;this.setData({'form.regionId':id,'form.historicalIndex':'','form.szScopeConfirmed':'unknown',result:null,error:'',compare:false,baseInput:'',baseModeIndex:0});this.refresh();session.save('flexible',this.data);},
 onHide(){session.save('flexible',this.data);},onUnload(){session.save('flexible',this.data);},
 refresh(){const f=this.data.form,local=cities.capability(f.regionId||'440100','employee');if(indexRules.stale(this.data.result,local,f.dataAsOf))this.setData({result:null,compare:false,error:'请重新计算，以使用当前参数。'});this.setData({regionReady:!!local&&local.status==='READY'});if(local&&!local.legacy&&f.dataAsOf<local.effectiveFrom){this.setData({result:null,error:'已录入规则从'+local.effectiveFrom+'起使用，请在更多设置修改截至月份'});}if(!local||local.status!=='READY'){this.setData({result:null,baseError:local&&local.reason||'地区暂未开放',futurePayment:'',accountSummary:''});return;}const limits=contributionRange(local.effectiveFrom&&f.dataAsOf<local.effectiveFrom?local.effectiveFrom:f.dataAsOf,f.regionId);let h=null,principal='',accountError='',historyError='',base='',baseError='';
  try{h=inputs.history(f);}catch(e){historyError=e.message;}
  const categories=categoryRules.options(f.regionId,h?h.unit:null),correctCategory=categories.restricted&&f.category==='FEMALE_50',category=correctCategory?'FEMALE_55':f.category;
  if(correctCategory)this.setData({'form.category':category,result:null,compare:false,error:'已按当地规则改为原55岁类别，请重新计算。'});
  this.setData({categoryValues:categories.values,categoryLabels:categories.labels,categoryIndex:Math.max(0,categories.values.indexOf(category)),categoryNote:categories.note});
  try{if(h)principal=this.data.accountMode==='known'?inputs.amount(f.principal,'查询到的账户余额',true).toFixed(2):inputs.estimate(f,h,limits.min,this.data.historyModeIndex===1);}catch(e){accountError=e.message;}
  try{base=inputs.futureBase(this.data.baseModeIndex,this.data.baseInput,limits);}catch(e){baseError=e.message;}
  const effective=this.data.planIndex===1||this.data.planIndex===2?limits.min:base;
  let missing='';try{if(h)missing=duration(Math.max(0,minimum(Number(retirement(f.birthMonth,category).month.slice(0,4)))-h.total));}catch(e){}
  this.setData({minimumPayment:(limits.min*.2).toFixed(2),maximumPayment:(limits.max*.2).toFixed(2),limits,historySummary:h,historyError,accountError,accountPrincipal:principal,accountSummary:principal===''?'':Math.round(Number(principal)).toLocaleString('en-US'),base,baseError,futureBase:String(effective),futurePayment:effective===''?'':(Number(effective)*.2).toFixed(2),paidDuration:h?duration(h.total):'—',missingDuration:missing});
 },
 input(e){const k=e.currentTarget.dataset.key;if(!Object.prototype.hasOwnProperty.call(this.data.form,k))return;this.setData({['form.'+k]:e.detail.value,error:''});this.refresh();},
 category(e){const n=Number(e.detail.value),values=this.data.categoryValues||['MALE','FEMALE_55','FEMALE_50'];if(!values[n])return;this.setData({categoryIndex:n,'form.category':values[n],error:'',result:null});this.refresh();},
 accountMode(e){this.setData({accountMode:e.currentTarget.dataset.value,error:''});this.refresh();},
 historyMode(e){this.setData({historyModeIndex:Number(e.detail.value),error:''});this.refresh();},
 baseMode(e){this.setData({baseModeIndex:Number(e.detail.value),baseInput:'',error:''});this.refresh();},
 baseInput(e){this.setData({baseInput:e.detail.value,error:''});this.refresh();},
 plan(e){const n=Number(e.detail.value);this.setData({planIndex:n,'form.plan':plans[n],error:''});this.refresh();},
 toggleSection(e){const k=e.currentTarget.dataset.section;if(['accountOpen','paymentOpen'].includes(k))this.setData({[k]:!this.data[k]});},
 toggle(){this.setData({advanced:!this.data.advanced});},compare(){this.setData({compare:!this.data.compare,pendingPlan:null});},
 historyRights(e){this.setData({'form.historicalRights':e.detail.value,error:''});},
 calculate(){try{this.refresh();const d=this.data,f=d.form,b=serial(f.birthMonth),a=serial(f.dataAsOf),first=serial(f.firstInsuredMonth);
  if(b===null||f.birthMonth<d.dateBounds.birthStart||f.birthMonth>d.dateBounds.birthEnd)throw Error('请选择18至70岁的出生年月');
  if(a===null||f.dataAsOf>d.dateBounds.todayMonth)throw Error('数据截至月份不能晚于当前月份');
  if(first===null||first<b+16*12||first>a)throw Error('请在更多设置里核对首次缴费月份，应在16岁以后且不晚于截至月');
  if(d.historyError)throw Error(d.historyError);
  if(d.accountError){this.setData({accountOpen:true});throw Error(d.accountError);}
  if(d.baseError&&d.planIndex!==1&&d.planIndex!==2){this.setData({paymentOpen:true});throw Error(d.baseError);}
  const payload={...f,paidMonths:d.historySummary.total,pastEmployeeMonths:d.historySummary.unit,principal:d.accountPrincipal,currentBase:d.planIndex===1||d.planIndex===2?String(d.limits.min):d.base,contributionType:'FLEXIBLE'};
  const r=forecast(payload),scenarios=r.scenarios.map(show);this.setData({result:{...r,scenarios,chosen:scenarios.find(s=>s.plan===f.plan),estimatedAccount:d.accountMode==='estimate',accountPrincipal:d.accountPrincipal,history:{...d.historySummary}},error:'',compare:false,pendingPlan:null,advanced:false});session.save('flexible',this.data);wx.pageScrollTo({scrollTop:0,duration:200});
 }catch(e){this.setData({error:e.message,advanced:/首次|开始参保|最多|历史|特殊/.test(e.message)?true:this.data.advanced});wx.pageScrollTo({scrollTop:0,duration:200});}},
 selectPlan(e){const plan=e.currentTarget.dataset.plan;if(this.data.result&&this.data.result.scenarios.some(s=>s.plan===plan))this.setData({pendingPlan:plan});},
 applySelectedPlan(){if(!this.data.pendingPlan)return;this.choosePlan({currentTarget:{dataset:{plan:this.data.pendingPlan}}});this.setData({pendingPlan:null,compare:false});session.save('flexible',this.data);if(wx.showToast)wx.showToast({title:'方案已更新',icon:'success'});},
 resultInfo(){const r=this.data.result;if(!r)return;const notes=[r.referenceNote,...(r.warnings||[]),'个人承担全部养老费，现行缴费比例20%，其中缴费基数的8%进个人账户。'];if(r.estimatedAccount)notes.push('个人账户按'+r.accountPrincipal+'元估算，未计历年变化和利息。');if(r.chosen.lastPaymentMonth>r.retirement.month)notes.push('到龄后还需延缴，办理条件请向参保地确认。');if(this.data.form.plan==='MINIMUM_STOP')notes.push('交够年限可停缴，仍需等到领取年龄。');wx.showModal({title:'计算说明',content:notes.filter(Boolean).join('\n'),showCancel:false});},
 choosePlan(e){const p=e.currentTarget.dataset.plan,s=this.data.result.scenarios.find(x=>x.plan===p);if(!s)return;this.setData({'form.plan':p,planIndex:plans.indexOf(p),'result.chosen':s});this.refresh();session.save('flexible',this.data);wx.pageScrollTo({scrollTop:0,duration:200});},
 edit(){this.setData({result:null,error:'',compare:false,pendingPlan:null,advanced:false});session.save('flexible',this.data);wx.pageScrollTo({scrollTop:0,duration:0});},
 reset(){const regionId=this.data.form.regionId;this.setData(defaults());this.setData({'form.regionId':regionId});this.refresh();session.save('flexible',this.data);wx.pageScrollTo({scrollTop:0,duration:0});},
 info(e){if(e.currentTarget.dataset.key==='category'){const rule=categoryRules.rule(this.data.form.regionId);wx.showModal({title:'女性退休类别',content:rule==='GUANGXI_CURRENT_IDENTITY'?'广西按申领时的参保身份认定。退休时仍以灵活就业身份参保，原退休类别为55岁，即使以前在单位交过也一样。页面已按出生年月加入延迟退休；若退休时转为单位职工，请到职工养老入口按实际岗位核对。':rule==='GUANGDONG_HISTORY'?'广东一直自己交、没有单位职工参保记录的女性，按原55岁类别。有单位职工参保经历的，还要结合岗位和身份认定，不能只凭交过几年决定。页面会按出生年月加入延迟退休；不确定时请向社保核对类别。':'女性退休类别受原身份、岗位和参保经历影响，请按当地社保确认的类别选择。',showCancel:false});return;}if((this.data.form.regionId||'440100')!=='440100'&&e.currentTarget.dataset.key==='account'){wx.showModal({title:'账户金额去哪查？',content:'可在电子社保卡、国家社会保险公共服务平台或当地人社服务中查询养老保险个人权益记录。填写个人账户金额，不是单位与个人累计缴费总额。使用含利息的余额时，不要再重复添加利息。',showCancel:false});return;}const texts={history:'单位和灵活就业的职工养老年限可以累计。同一个月只能算一次；不要填医保、居民养老或重复缴费年限。没有交过的那一项填0。',account:'粤省事 → 社保·就业 → 养老 → 参保缴费状态查询 → 职工社保。单位和灵活就业使用同一个个人账户；查到含利息的余额可直接填，不要把累计缴费总额当余额。',rules:'本页已开放地区的灵活就业可在缴费基数上下限内自选，自己承担20%，其中基数的8%进入个人账户。通常不能补交过去断缴年限；到龄不够年限需按规定继续交。退休地、延缴资格和特殊补缴请向社保确认。'};wx.showModal({title:'怎么填？',content:texts[e.currentTarget.dataset.key]||'',showCancel:false});},
 policy(){wx.navigateTo({url:'/pages/policy/policy?city='+(this.data.form.regionId||'440100')+'&kind=flexible'});},
 onShareAppMessage(){return {title:brand.name+' · 灵活就业养老',path:'/flexible/pages/calc/calc'};}
});
