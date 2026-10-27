const reference=require('./gx-reference-plan');
module.exports={
 openReferencePlan(){try{const plan=reference.build(this.data.form,this.data.region);this.setData({referencePlan:{...plan,selected:plan.options.find(x=>x.tier===plan.tier)},quickPlan:null,error:''});this.scrollTop();}catch(e){this.setData({error:e.message});}},
 chooseReference(e){const tier=Number(e.currentTarget.dataset.tier),selected=this.data.referencePlan.options.find(x=>x.tier===tier);if(selected)this.setData({'referencePlan.tier':tier,'referencePlan.selected':selected});},
 closeReferencePlan(){this.setData({referencePlan:null});this.scrollTop();},
 referenceRecords(){this.setData({referencePlan:null});if(this.data.form.historyUncertain)this.openRecordHelp();else this.openPaymentPlanner();}
};
