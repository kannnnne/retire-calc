const {cities}=require('./city-policies');
const documents=[];const seen=new Set();
for(const c of cities)for(const kind of ['employee','resident'])for(const s of c[kind].sources||[]){if(seen.has(s.id))continue;seen.add(s.id);documents.push({id:s.id,cityId:c.id,kind,title:s.name,publisher:c.name+'官方政策来源',date:'核对于2026-10-17',number:'地区政策参考',url:s.url,sections:[{title:'本工具采用的内容',text:s.text}],note:'仅整理已核实的部分。年度金额不代表未来标准；登记了来源不等于该城市已开放计算。'});}
module.exports=documents;
