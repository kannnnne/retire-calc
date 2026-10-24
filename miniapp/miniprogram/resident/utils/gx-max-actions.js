const max=require('./gx-max-plan'),{calculate}=require('./calculate'),experience=require('./payment-experience');
const hide=()=>{if(typeof wx!=='undefined'&&typeof wx.hideKeyboard==='function')wx.hideKeyboard();};
module.exports={
 openMaxPlan(){try{const f=JSON.parse(JSON.stringify(this.data.form)),config=max.setup(f,this.data.region);this.setData({quickPlan:{base:f,config,selected:config.selected,annual:config.annual,editYears:false,mode:'TO_SIXTY',confirmed:false,details:false,draft:null,summary:null,error:''}});this.quickGenerate();hide();this.scrollTop();}catch(e){this.setData({error:e.message});}},
 quickGenerate(){const q=this.data.quickPlan;if(!q)return;try{const d=max.build(q.base,this.data.region,{mode:q.mode,...(!q.config.complete?{selected:q.selected,annual:q.annual}:{}),...(q.currentSubsidy!==undefined?{currentSubsidy:q.currentSubsidy}:{})});
  // Explicitly hypothetical preview. Do not save the engine's confirmation into the user's form.
  const r=calculate(experience.projectionInput({...d.form,gxScopeReviewed:'yes'})),s=r.chosen,month=Math.round(Number(s.low)/10)*10;
  this.setData({'quickPlan.draft':d,'quickPlan.subsidyInputVisible':d.subsidyUsed!==null,'quickPlan.subsidyDisplay':d.subsidyUsed,'quickPlan.summary':{inferred:d.inferred,currentAssumed:d.currentAssumed,monthly:month,immediate:s.immediateCost||'0.00',future:s.timeline.normalCost,total:s.total,normalYears:s.timeline.normalYears,firstYear:s.timeline.firstYear,lastYear:s.timeline.lastYear,receipt:s.receiptMonth,paid:q.base.years,added:d.addedYears,upgraded:d.upgradedYears,subsidyUsed:d.subsidyUsed,subsidyReference:d.subsidyReference,ageOnly:!!q.base.ageOnly,entries:r.makeup?r.makeup.entries:[]},'quickPlan.confirmed':false,'quickPlan.error':''});hide();
 }catch(e){this.setData({'quickPlan.draft':null,'quickPlan.summary':null,'quickPlan.confirmed':false,'quickPlan.error':e.message});}},
 quickMode(e){this.setData({'quickPlan.mode':e.currentTarget.dataset.mode,'quickPlan.confirmed':false});if(this.data.quickPlan.config.complete||this.data.quickPlan.selected.length===Number(this.data.quickPlan.base.years))this.quickGenerate();},
 quickYear(e){const q=this.data.quickPlan,y=Number(e.currentTarget.dataset.year);if(!q.config.years.some(v=>v.year===y))return;const selected=q.selected.includes(y)?q.selected.filter(x=>x!==y):q.selected.concat(y);this.setData({'quickPlan.selected':selected,'quickPlan.config.years':q.config.years.map(x=>({...x,selected:selected.includes(x.year)})),'quickPlan.draft':null,'quickPlan.summary':null,'quickPlan.confirmed':false,'quickPlan.error':''});},
 quickAnnual(e){this.setData({'quickPlan.annual':e.detail.value,'quickPlan.summary':null,'quickPlan.draft':null,'quickPlan.confirmed':false});},
 quickEditYears(){this.setData({'quickPlan.editYears':!this.data.quickPlan.editYears});},
 quickPaid(e){try{const base={...this.data.quickPlan.base,paidThisYear:e.currentTarget.dataset.value},config=max.setup(base,this.data.region);this.setData({'quickPlan.base':base,'quickPlan.config':config,'quickPlan.selected':config.selected,'quickPlan.confirmed':false});this.quickGenerate();}catch(e){this.setData({'quickPlan.error':e.message});}},
 quickSubsidy(e){this.setData({'quickPlan.currentSubsidy':e.detail.value,'quickPlan.confirmed':false,'quickPlan.summary':null,'quickPlan.draft':null});},
 quickDetails(){this.setData({'quickPlan.details':!this.data.quickPlan.details});},quickConfirm(){this.setData({'quickPlan.confirmed':!this.data.quickPlan.confirmed,'quickPlan.error':''});},
 cancelMaxPlan(){this.setData({quickPlan:null});this.scrollTop();},
 applyMaxPlan(){const q=this.data.quickPlan;if(!q||!q.draft)return;if(!q.confirmed){this.setData({'quickPlan.error':'请先核对原记录、拟补年份和补贴，确认尚未领取养老金'});return;}
  const previous={};for(const k of ['form','result','baseline','display','planOptions','compare'])previous[k]=this.data[k];this.setData({form:{...q.draft.form,gxScopeReviewed:'yes'},result:null,error:''});this.refreshPolicyQuestions();this.calculate(true);
  if(this.data.result&&!this.data.error)this.setData({quickPlan:null});else {const error=this.data.error;this.setData({...previous,error:'','quickPlan.error':error});this.refreshPolicyQuestions();}
 }
};
