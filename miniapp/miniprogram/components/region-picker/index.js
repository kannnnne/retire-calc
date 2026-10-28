const {cities,capability}=require('../../utils/city-policies');
const residents=require('../../utils/resident-registry');
const employees=require('../../utils/employee-registry');
const optionsFor=kind=>kind==='resident'?residents.provinces:kind==='employee'?employees.provinces:provinces;
const provinces=[];
for(const c of cities){let p=provinces.find(x=>x.id===c.provinceId);if(!p){p={id:c.provinceId,name:c.province,cities:[]};provinces.push(p);}p.cities.push(c);}
provinces.sort((a,b)=>Number(a.id)-Number(b.id));
Component({properties:{compact:{type:Boolean,value:false},value:{type:String,value:'440100',observer:'sync'},kind:{type:String,value:'employee',observer:'sync'},residentArea:{type:String,value:'',observer:'sync'}},data:{provinces:provinces.map(p=>p.name),provinceIndex:0,cityIndex:0,cityLabels:[]},lifetimes:{attached(){this.sync();}},methods:{reference(){this.setData({referenceOpen:!this.data.referenceOpen});},
 sync(){const options=optionsFor(this.data.kind);const pi=Math.max(0,options.findIndex(p=>p.cities.some(c=>c.id===this.data.value))),p=options[pi],ci=Math.max(0,p.cities.findIndex(c=>c.id===this.data.value)),c=p.cities[ci],base=this.data.kind==='resident'?residents.capability(c.id):this.data.kind==='employee'?employees.capability(c.id):capability(c.id,this.data.kind),rule=this.data.kind==='resident'?require('../../utils/local-resident-policies').resolve(base,(base&&base.areas||[]).some(x=>x.id===this.data.residentArea)?this.data.residentArea:''):base;this.setData({provinces:options.map(p=>p.name),provinceIndex:pi,cityIndex:ci,cityLabels:p.cities.map(c=>c.name),name:c.name,pending:!rule||rule.status!=='READY',reason:rule&&rule.reason||'',referenceOpen:false,referenceLabel:rule&&rule.referenceLabel||'',referenceText:rule&&rule.referenceText||''});},
 province(e){const p=(optionsFor(this.data.kind))[Number(e.detail.value)];if(p)this.select(p.cities[0]);},city(e){const c=(optionsFor(this.data.kind))[this.data.provinceIndex].cities[Number(e.detail.value)];if(c)this.select(c);},
 select(c){this.triggerEvent('change',{regionId:c.id});},policy(){wx.navigateTo({url:(this.data.kind==='resident'?'/resident/pages/policy/policy?city='+this.data.value+'&area='+this.data.residentArea:'/pages/policy/policy?city='+this.data.value+'&kind='+this.data.kind)});}
}});
