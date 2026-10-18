const {cities}=require('./city-policies');
const documents=[];const seen=new Map();
for(const c of cities)for(const kind of ['employee','resident'])for(const s of c[kind].sources||[]){const key=kind+':'+s.id;if(seen.has(key)){seen.get(key).cityIds.push(c.id);continue;}const document={id:s.id,cityId:c.id,cityIds:[c.id],kind,title:s.name,publisher:'政策原文或注明出处的通知全文',date:'核对于2026-10-18',number:'地区政策参考',url:s.url,sections:[{title:'本工具采用的内容',text:s.text}],note:'年度参数用于静态参考，不预测未来标准。省级参考不包含未核实的市县加发，参保和补缴资格需按当地规定办理。'};documents.push(document);seen.set(key,document);}
module.exports=documents;
