// Present current local tiers as references; historical amounts remain actual input.
module.exports={
 refreshContributionInputs(){
  const f=this.data.form,tiers=this.data.region.tiers||[],index=tiers.indexOf(Number(f.pastAnnual));
  this.setData({pastTiers:tiers,pastTierLabels:[...tiers.map(v=>v+'元／年'),'自己填写'],pastTierIndex:index<0||this.data.pastManual||f.pastMonthly?tiers.length:index,pastManual:!!(this.data.pastManual||f.pastMonthly||index<0),futureInputLabels:[...this.data.tierLabels,'自己填写'],futureInputIndex:this.data.futureManual?this.data.tiers.length:this.data.tierIndex});
 },
 pastTier(e){const index=Number(e.detail.value),tiers=this.data.pastTiers||[];if(index===tiers.length){this.setData({pastManual:true,pastTierIndex:index,pastAmountAuto:false});return;}if(tiers[index]===undefined)return;
  this.setData({'form.pastAnnual':String(tiers[index]),'form.pastMonthly':false,'form.gxScopeReviewed':'unknown','form.gxTransitionReviewed':'unknown',pastManual:false,pastAmountAuto:false,pastTierIndex:index,result:null,error:''});
 },
 openSupplementPlans(){const f=this.data.form;if(this.data.region.rule==='GUANGXI_ORDINARY'&&!f.never&&(f.historyUncertain||f.pastMonthly||f.historyMode!=='segments'&&!(this.data.region.tiers||[]).includes(Number(f.pastAnnual))))return this.openReferencePlan();if(this.data.region.rule==='GUANGXI_ORDINARY'&&!f.never&&Number(f.years)>0)this.openMaxPlan();else this.openPaymentPlanner();},
 futureTierChoice(e){const index=Number(e.detail.value);if(index===this.data.tiers.length){this.setData({futureManual:true,futureDraft:String(this.data.form.tier),futureInputIndex:index});return;}if(this.data.tiers[index]===undefined)return;this.setData({futureManual:false,futureInputIndex:index});this.tier(e);},
 futureDraftInput(e){this.setData({futureDraft:e.detail.value,result:null,error:''});},
 futureSubmit(){const value=Number(this.data.futureDraft),index=this.data.tiers.indexOf(value);if(this.data.region.continuous&&/^\d+(\.\d{1,2})?$/.test(String(this.data.futureDraft))&&value>=1000&&value<=9000){this.input({currentTarget:{dataset:{key:'tier'}},detail:{value:this.data.futureDraft}});return true;}if(index<0){this.setData({error:'这个地区不能选这个年缴金额，请从下拉框选择当地档次'});return false;}this.tier({detail:{value:index}});this.setData({futureInputIndex:this.data.tiers.length});return true;},
 quickUniformTier(e){const tiers=this.data.region.tiers,index=Number(e.detail.value);if(index===tiers.length){this.setData({'quickPlan.manualTier':true});return;}if(tiers[index]===undefined)return;this.setData({'quickPlan.manualTier':false});this.quickChoice({currentTarget:{dataset:{tier:tiers[index]}}});}
};
