const max=require('./gx-max-plan'),{calculate}=require('./calculate'),experience=require('./payment-experience');
const D=require('../../vendor/decimal');
const hide=()=>{if(typeof wx!=='undefined'&&typeof wx.hideKeyboard==='function')wx.hideKeyboard();};
function preview(q,p,tier=q.tier,targets=q.targets,futureTier=q.futureTier){
 const d=max.build(q.base,p,{mode:q.mode,tier,futureTier,targets,...(!q.config.complete?{selected:q.selected,annual:q.annual}:{}),...(q.currentSubsidy!==undefined?{currentSubsidy:q.currentSubsidy}:{})});
 const r=calculate(experience.projectionInput({...d.form,gxScopeReviewed:'yes'})),s=r.chosen;
 const entries=r.makeup?r.makeup.entries:[],cost=mode=>entries.filter(x=>x.mode===mode).reduce((sum,x)=>sum.plus(x.cost),new D(0)).toFixed(2);
 return {draft:d,summary:{missingCost:cost('missing'),upgradeCost:cost('upgrade'),inferred:d.inferred,currentAssumed:d.currentAssumed,monthly:Math.round(Number(s.low)/10)*10,immediate:s.immediateCost||'0.00',future:s.timeline.normalCost,total:s.total,normalYears:s.timeline.normalYears,firstYear:s.timeline.firstYear,lastYear:s.timeline.lastYear,receipt:s.receiptMonth,paid:q.base.years,added:d.addedYears,upgraded:d.upgradedYears,subsidyUsed:d.subsidyUsed,subsidyReference:d.subsidyReference,ageOnly:!!q.base.ageOnly,entries}};
}
module.exports={
 openMaxPlan(){try{const f=JSON.parse(JSON.stringify(this.data.form)),config=max.setup(f,this.data.region),tier=this.data.region.tiers[this.data.region.tiers.length-1];this.setData({quickPlan:{base:f,config,selected:config.selected,annual:config.annual,editYears:false,mode:'TO_SIXTY',tier,futureTier:tier,targets:{},options:[],tierInput:String(tier),tierLabels:this.data.region.tiers.map(v=>v+'元／年'),futureIndex:this.data.region.tiers.indexOf(tier),confirmed:false,details:false,draft:null,summary:null,error:''}});this.quickGenerate();hide();this.scrollTop();}catch(e){this.setData({error:e.message});}},
 quickGenerate(){const q=this.data.quickPlan;if(!q)return;if(q.dirty&&Number(q.tierInput)!==q.tier){this.quickTierSubmit();return;}const p=this.data.region,options=[];for(const tier of p.tiers.filter(v=>[200,500,1000,2000,3000,6000].includes(v))){try{const s=preview(q,p,tier,{},tier).summary;options.push({tier,monthly:s.monthly,receipt:s.receipt,total:s.total});}catch(e){/* Active preview below provides the validation error. */}}
 this.setData({'quickPlan.options':options});try{const {draft:d,summary}=preview(q,p);
  // Explicitly hypothetical preview. Do not save the engine's confirmation into the user's form.
  this.setData({'quickPlan.draft':d,'quickPlan.dirty':false,'quickPlan.subsidyInputVisible':d.subsidyUsed!==null,'quickPlan.subsidyDisplay':d.subsidyUsed,'quickPlan.summary':summary,'quickPlan.confirmed':false,'quickPlan.error':''});hide();
 }catch(e){this.setData({'quickPlan.draft':null,'quickPlan.summary':null,'quickPlan.confirmed':false,'quickPlan.error':e.message});}},
 quickChoice(e){const tier=Number(e.currentTarget.dataset.tier);if(!this.data.region.tiers.includes(tier))return;this.setData({'quickPlan.tier':tier,'quickPlan.futureTier':tier,'quickPlan.tierInput':String(tier),'quickPlan.futureIndex':this.data.region.tiers.indexOf(tier),'quickPlan.targets':{},'quickPlan.custom':false});this.quickGenerate();},
 quickTierInput(e){this.setData({'quickPlan.tierInput':e.detail.value,'quickPlan.confirmed':false,'quickPlan.dirty':true});},
 quickRefresh(){if(Number(this.data.quickPlan.tierInput)!==this.data.quickPlan.tier)this.quickTierSubmit();else this.quickGenerate();},
 quickTierSubmit(){const tier=Number(this.data.quickPlan.tierInput);if(!this.data.region.tiers.includes(tier)){this.setData({'quickPlan.error':'请填写当地允许的年缴档次：'+this.data.region.tiers.join('、')+'元'});return;}this.quickChoice({currentTarget:{dataset:{tier}}});},
 quickFuture(e){const tier=this.data.region.tiers[Number(e.detail.value)];if(tier===undefined)return;this.setData({'quickPlan.futureTier':tier,'quickPlan.futureIndex':Number(e.detail.value),'quickPlan.custom':true});this.quickGenerate();},
 quickTarget(e){const q=this.data.quickPlan,row=q.draft&&q.draft.editable.find(x=>x.year===Number(e.currentTarget.dataset.year));if(!row)return;const target=row.allowed[Number(e.detail.value)];if(target===undefined)return;this.setData({'quickPlan.targets':{...q.targets,[row.year]:target},'quickPlan.custom':true});this.quickGenerate();},
 quickMode(e){this.setData({'quickPlan.mode':e.currentTarget.dataset.mode,'quickPlan.targets':{},'quickPlan.confirmed':false});if(this.data.quickPlan.config.complete||this.data.quickPlan.selected.length===Number(this.data.quickPlan.base.years))this.quickGenerate();},
 quickYear(e){const q=this.data.quickPlan,y=Number(e.currentTarget.dataset.year);if(!q.config.years.some(v=>v.year===y))return;const selected=q.selected.includes(y)?q.selected.filter(x=>x!==y):q.selected.concat(y);this.setData({'quickPlan.selected':selected,'quickPlan.targets':{},'quickPlan.options':[],'quickPlan.config.years':q.config.years.map(x=>({...x,selected:selected.includes(x.year)})),'quickPlan.draft':null,'quickPlan.summary':null,'quickPlan.confirmed':false,'quickPlan.error':''});},
 quickAnnual(e){this.setData({'quickPlan.annual':e.detail.value,'quickPlan.summary':null,'quickPlan.draft':null,'quickPlan.confirmed':false});},
 quickEditYears(){this.setData({'quickPlan.editYears':!this.data.quickPlan.editYears});},
 quickPaid(e){try{const base={...this.data.quickPlan.base,paidThisYear:e.currentTarget.dataset.value},config=max.setup(base,this.data.region);this.setData({'quickPlan.base':base,'quickPlan.config':config,'quickPlan.selected':config.selected,'quickPlan.targets':{},'quickPlan.confirmed':false});this.quickGenerate();}catch(e){this.setData({'quickPlan.error':e.message});}},
 quickSubsidy(e){this.setData({'quickPlan.currentSubsidy':e.detail.value,'quickPlan.confirmed':false,'quickPlan.summary':null,'quickPlan.draft':null});},
 quickDetails(){this.setData({'quickPlan.details':!this.data.quickPlan.details});},quickConfirm(){this.setData({'quickPlan.confirmed':!this.data.quickPlan.confirmed,'quickPlan.error':''});},
 cancelMaxPlan(){this.setData({quickPlan:null});this.scrollTop();},
 applyMaxPlan(){const q=this.data.quickPlan;if(!q||!q.draft)return;if(q.dirty){this.setData({'quickPlan.error':'金额修改后，请先点击更新'});return;}if(!q.confirmed){this.setData({'quickPlan.error':'请先核对原记录、拟补年份和补贴，确认尚未领取养老金'});return;}
  const previous={};for(const k of ['form','result','baseline','display','planOptions','compare'])previous[k]=this.data[k];this.setData({form:{...q.draft.form,gxScopeReviewed:'yes'},result:null,error:''});this.refreshPolicyQuestions();this.calculate(true);
  if(this.data.result&&!this.data.error)this.setData({quickPlan:null});else {const error=this.data.error;this.setData({...previous,error:'','quickPlan.error':error});this.refreshPolicyQuestions();}
 }
};
