const {cities,capability}=require('../../utils/city-policies');
const provinces=[];
for(const c of cities){let p=provinces.find(x=>x.id===c.provinceId);if(!p){p={id:c.provinceId,name:c.province,cities:[]};provinces.push(p);}p.cities.push(c);}
provinces.sort((a,b)=>{const order=['440000','450000','110000','310000','510000','330000','610000'];return order.indexOf(a.id)-order.indexOf(b.id);});
Component({properties:{value:{type:String,value:'440100',observer:'sync'},kind:{type:String,value:'employee',observer:'sync'}},data:{provinces:provinces.map(p=>p.name),provinceIndex:0,cityIndex:0,cityLabels:[]},lifetimes:{attached(){this.sync();}},methods:{reference(){this.setData({referenceOpen:!this.data.referenceOpen});},
 sync(){const pi=Math.max(0,provinces.findIndex(p=>p.cities.some(c=>c.id===this.data.value))),p=provinces[pi],ci=Math.max(0,p.cities.findIndex(c=>c.id===this.data.value)),c=p.cities[ci],rule=capability(c.id,this.data.kind);this.setData({provinceIndex:pi,cityIndex:ci,cityLabels:p.cities.map(c=>c.name),name:c.name,pending:!rule||rule.status!=='READY',reason:rule&&rule.reason||'',referenceOpen:false,referenceLabel:rule&&rule.referenceLabel||'',referenceText:rule&&rule.referenceText||''});},
 province(e){const p=provinces[Number(e.detail.value)];if(p)this.select(p.cities[0]);},city(e){const c=provinces[this.data.provinceIndex].cities[Number(e.detail.value)];if(c)this.select(c);},
 select(c){this.triggerEvent('change',{regionId:c.id});},policy(){wx.navigateTo({url:'/pages/policy/policy?city='+this.data.value+'&kind='+this.data.kind});}
}});
