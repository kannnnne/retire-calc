const policies=require('../../utils/resident-makeup-policies');
const labels={missing:'补漏交年份',upgrade:'补已交差额',lump:'到龄补足'};
module.exports={
 openApprovedPlan(){const rule=policies.get(this.data.form.regionId,this.data.region.rule);if(!rule)return;this.setData({approvedPlanning:true,approvedPolicy:rule,approvedModes:rule.modes.map(x=>labels[x]),approvedModeIndex:0,approvedReturn:JSON.parse(JSON.stringify({form:this.data.form,result:this.data.result,baseline:this.data.baseline,display:this.data.display,compare:this.data.compare})),approvedDraft:{mode:rule.modes[0],annual:'',original:'',start:'',end:'',confirmed:'unknown'},error:''});},
 approvedMode(e){const i=Number(e.detail.value),mode=this.data.approvedPolicy.modes[i];if(mode)this.setData({approvedModeIndex:i,'approvedDraft.mode':mode,'approvedDraft.confirmed':'unknown',error:''});},
 approvedInput(e){const key=e.currentTarget.dataset.key;if(['annual','original','start','end'].includes(key))this.setData({['approvedDraft.'+key]:e.detail.value,'approvedDraft.confirmed':'unknown',error:''});},
 approvedConfirm(){this.setData({'approvedDraft.confirmed':this.data.approvedDraft.confirmed==='yes'?'unknown':'yes'});},
 cancelApprovedPlan(){this.setData({...this.data.approvedReturn,approvedPlanning:false,approvedReturn:null,error:''});},
 applyApprovedPlan(){const f=this.data.form,birth=f.ageOnly?(Number(f.asOf.slice(0,4))-Number(f.age))+'-'+f.asOf.slice(5):f.birth;this.setData({'form.approvedPlan':{...this.data.approvedDraft,regionId:f.regionId,birth,asOf:f.asOf,paidYears:String(f.years)},result:null,error:''});this.calculate();if(this.data.result&&!this.data.error)this.setData({approvedPlanning:false,approvedReturn:null});},
 removeApprovedPlan(){this.setData({'form.approvedPlan':null,error:'',result:null});this.calculate();}
};
