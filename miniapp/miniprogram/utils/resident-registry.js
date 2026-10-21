// Resident-only national registry. Existing employee/flexible coverage stays unchanged.
const legacy=require('./city-policies'),data=require('./resident-region-data'),profiles=require('./national-resident-policies'),extended=require('./extended-policies');
const priority=['440000','450000','110000','310000','510000','330000','610000'];
function rank(id){const n=priority.indexOf(id);return n<0?100+Number(id):n;}
const provinces=data.provinces.map(p=>({...p,cities:p.cities.map(c=>{
 const existing=legacy.city(c.id);if(existing)return existing;
 const profile=(p.id==='650000'&&c.id.startsWith('659')?profiles.XJBT:profiles[p.id])||(extended.provinceReferences[p.id]||{}).resident;
 const resident=profile?{...profile,policyProvinceId:p.id,scope:'PROVINCE_REFERENCE'}:{status:'PENDING',reason:p.name+'省级缴费档次、基础额及补缴条件正在接入，暂不套用其他省的标准。',sources:[]};
 return {...c,provinceId:p.id,province:p.name,resident};
})})).sort((a,b)=>rank(a.id)-rank(b.id));
const cities=provinces.flatMap(p=>p.cities),byId=new Map(cities.map(c=>[c.id,c]));
function city(id){return byId.get(id)||null;}
function capability(id,kind='resident'){return kind==='resident'?(city(id)||{}).resident||null:legacy.capability(id,kind);}
module.exports={provinces,cities,city,capability};
