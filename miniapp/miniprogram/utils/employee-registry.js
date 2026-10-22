// Employee-only extension: resident and flexible registries retain their scope.
const legacy=require('./city-policies'),data=require('./resident-region-data');
const national=require('./national-employee-policies'),extended=require('./extended-policies');
const provinces=data.provinces.map(p=>({...p,cities:p.cities.map(c=>{
 const existing=legacy.city(c.id),province=extended.provinceReferences[p.id];
 const known=existing&&existing.employee&&existing.employee.status==='READY'?existing.employee:null;
 const profile=known||(province&&province.employee)||national.profiles[p.id];
 const employee=profile?{...profile,...(!known?national.overrides[c.id]||{}:{}),policyProvinceId:p.id}:{status:'PENDING',reason:'本地区暂未开放：'+(national.skipped[p.id]||'关键参数尚未核齐')+'，暂不提供金额。',sources:[]};
 return {...existing,...c,provinceId:p.id,province:p.name,employee};
})})).sort((a,b)=>Number(a.id)-Number(b.id));
const cities=provinces.flatMap(p=>p.cities),byId=new Map(cities.map(c=>[c.id,c]));
function city(id){return byId.get(id)||null;}
function capability(id,kind='employee'){return kind==='employee'?(city(id)||{}).employee||null:legacy.capability(id,kind);}
function requireEmployee(id,asof){const c=city(id||'440100'),p=c&&c.employee;if(!p||p.status!=='READY')throw Error(p?p.reason:'请选择已开放的领取地区');if(!p.legacy&&asof<p.effectiveFrom)throw Error(c.name+'当前录入规则从'+p.effectiveFrom+'起使用，请核对数据截至月份');return p;}
module.exports={provinces,cities,city,capability,requireEmployee};
