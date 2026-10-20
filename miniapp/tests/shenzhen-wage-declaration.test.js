const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {contributionRange,resolveBase,salaryGuidance}=require('../miniprogram/utils/input-model');
const registry=require('../miniprogram/utils/city-policies'),documents=require('../miniprogram/utils/city-documents');

function employeePage(store={}){
 const file=path.join(__dirname,'../miniprogram/pages/index/index.js');let definition,lastModal;
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{Page:p=>definition=p,Date,wx:{pageScrollTo(){},showModal(v){lastModal=v;}},require:name=>name.endsWith('/session')?{load:k=>store[k]||null,save:(k,v)=>store[k]=JSON.parse(JSON.stringify(v))}:require(path.resolve(path.dirname(file),name))});
 const p={...definition,data:JSON.parse(JSON.stringify(definition.data)),setData(values){for(const[key,value]of Object.entries(values)){let d=this.data;const keys=key.split('.');for(const k of keys.slice(0,-1))d=d[k];d[keys.at(-1)]=value;}},modal:()=>lastModal};p.onLoad();return p;
}

test('深圳工资估算使用上月／首月口径，现行上下限及8%个人扣款不倒套旧条例',()=>{
 const range=contributionRange('2026-10','440300');
 for(const [salary,base]of [['4000','5521.00'],['8000','8000.00'],['60000','27603.00']]){
  const r=resolveBase('SALARY',salary,range);assert.equal(r.base,base);assert.match(r.note,/上月工资/);assert.match(r.note,/首月工资/);assert.doesNotMatch(r.note,/上年/);
 }
 assert.equal(resolveBase('DEDUCTION','640',range).base,'8000.00');assert.equal(resolveBase('DIRECT','8000',range).base,'8000.00');
 for(const c of registry.cities.filter(c=>['440000','450000'].includes(c.provinceId)&&c.id!=='440300'))assert.match(salaryGuidance(c.id).label,/上年月平均/);
});

test('职工页切深圳后工资字段、说明及计算一致，切回广州恢复原口径',()=>{
 const p=employeePage();p.regionChanged({detail:{regionId:'440300'}});p.szScope({detail:{value:['yes']}});p.baseMode({detail:{value:'2'}});p.baseInput({detail:{value:'8000'}});
 assert.match(p.data.salaryLabel,/上月税前/);assert.match(p.data.baseNote,/首月工资/);assert.equal(p.data.basePayment,'640.00');
 p.info({currentTarget:{dataset:{key:'base'}}});assert.match(p.modal().content,/重新就业/);assert.doesNotMatch(p.modal().content,/上年度税前月平均/);
 p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.chosen.monthlyBase,'8000.00');assert.equal(p.data.result.chosen.monthlyPersonalPayment,'640.00');assert.equal(p.data.result.parameter.pensionBase,11293);
 p.regionChanged({detail:{regionId:'440100'}});assert.equal(p.data.result,null);assert.match(p.data.salaryLabel,/上年月平均/);p.baseMode({detail:{value:'2'}});p.baseInput({detail:{value:'8000'}});assert.doesNotMatch(p.data.baseNote,/首月工资/);
 p.info({currentTarget:{dataset:{key:'base'}}});assert.match(p.modal().content,/上年度税前月平均/);assert.doesNotMatch(p.modal().content,/深圳按上月/);
});

test('深圳旧会话中的通用工资标签恢复后按地区更新，仍保留输入金额',()=>{
 const store={},first=employeePage(store);first.regionChanged({detail:{regionId:'440300'}});first.szScope({detail:{value:['yes']}});first.baseMode({detail:{value:'2'}});first.baseInput({detail:{value:'8000'}});first.onHide();store.employee.salaryLabel='税前月工资（优先填上年月平均）';
 const restored=employeePage(store);assert.equal(restored.data.baseInput,'8000');assert.equal(restored.data.basePayment,'640.00');assert.match(restored.data.salaryLabel,/上月税前/);assert.match(restored.data.baseNote,/首月工资/);
});

test('深圳月缴提醒进入职工及灵活共用来源，不误作居民年缴期限或开放深户',()=>{
 const p=registry.capability('440300','flexible'),source=p.sources.find(x=>x.id==='sz-flex'),wage=p.sources.find(x=>x.id==='sz-wage-declaration-2021');
 assert.equal(source.checkedAt,'2026-10-20');assert.match(source.text,/深户21%、非深户20%/);assert.match(source.text,/跨月不得补缴/);assert.match(source.text,/21日不是最终缴费截止/);assert.match(source.text,/暂停月数表示未来停交/);assert.equal(p.nonLocalOnly,true);assert.equal(wage.checkedAt,'2026-10-20');assert.match(wage.text,/旧比例不能倒套2026/);
 for(const id of ['sz-flex','sz-wage-declaration-2021']){const d=documents.find(x=>x.id===id);assert.equal(d.kind,'employee');assert.deepEqual(d.cityIds,['440300']);for(const c of registry.cities){assert.ok(!c.resident.sources.some(x=>x.id===id));if(c.id!=='440300')assert.ok(!c.employee.sources.some(x=>x.id===id));}}
});
