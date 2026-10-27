module.exports={
 openRegistrationPlan(){if(this.data.form.receiving==='yes'){this.setData({error:'已经领取养老金，不适用这页参保前的缴费安排'});return;}this.setData({registrationPlan:true,quickPlan:null,referencePlan:null,error:''});this.scrollTop();},
 closeRegistrationPlan(){this.setData({registrationPlan:false});this.scrollTop();},
 registrationAnnual(){this.setData({registrationPlan:false});if(!this.data.result)this.calculate();if(this.data.result)this.setData({compare:true});},
 registrationQuestions(){this.setData({registrationPlan:false});this.openRecordHelp();},
 openPlanEntry(){this.openSupplementPlans();}
};
