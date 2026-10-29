const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function load(name,store={}){
 const file=path.join(__dirname,'../miniprogram',name+'.js'),dir=path.dirname(file),calls=[];let definition;
 const session={load:k=>store[k]?JSON.parse(JSON.stringify(store[k])):null,save:(k,v)=>store[k]=JSON.parse(JSON.stringify(v))};
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{Date,JSON,Page:v=>definition=v,require:id=>id.endsWith('/session')?session:require(path.resolve(dir,id)),wx:{pageScrollTo(){},showToast:v=>calls.push(v),showModal:v=>calls.push(v),hideKeyboard(){}}});
 const q={...definition,data:JSON.parse(JSON.stringify(definition.data)),setData(patch){for(const[k,v]of Object.entries(patch)){const parts=k.split('.');let target=this.data;for(const p of parts.slice(0,-1))target=target[p];target[parts.at(-1)]=v;}}};q.onLoad();return {q,store,calls};
}
for(const [name,key,field,invalid] of [['pages/index/index','employee','birthMonth','2099-01'],['flexible/pages/calc/calc','flexible','birthMonth','2099-01'],['resident/pages/basic/basic','resident-basic','age','99'],['resident/pages/calc/calc','resident','age','99']]){
 test(key+'：修改不丢原结果，校验失败可取消，切入口重开仍有原结果',()=>{
  const {q,store}=load(name);q.calculate();assert.ok(q.data.result,q.data.error);const original=JSON.stringify(q.data.result),form=JSON.stringify(q.data.form);
  q.beginResultEdit();assert.equal(q.data.result,null);assert.equal(q.data.editingResult,true);q.setData({['form.'+field]:invalid});q.calculate();assert.equal(q.data.result,null);assert.ok(q.data.error);
  q.onHide();assert.equal(JSON.stringify(store[key].result),original);assert.equal(JSON.stringify(store[key].form),form);const restored=load(name,store).q;assert.ok(restored.data.result);
  q.cancelResultEdit();assert.equal(JSON.stringify(q.data.result),original);assert.equal(JSON.stringify(q.data.form),form);assert.equal(q.data.editingResult,false);
 });
 test(key+'：重新填写须确认，取消保留；重算成功替换原结果',()=>{
  const {q,calls}=load(name);q.calculate();const original=JSON.stringify(q.data.result);q.requestResultReset();const cancel=calls.at(-1);assert.equal(JSON.stringify(q.data.result),original);cancel.success({confirm:false});assert.equal(JSON.stringify(q.data.result),original);
  q.beginResultEdit();q.calculate();assert.ok(q.data.result,q.data.error);assert.equal(q.data.editingResult,false);assert.equal(q._resultBackup,null);q.requestResultReset();calls.at(-1).success({confirm:true});assert.equal(q.data.result,null);assert.equal(q._resultBackup,null);assert.equal(q.data.form.regionId,'440100');
 });
}

test('居民补缴参考修改可撤销，计算表单重置统一使用取消／重置',()=>{const q=require('../scripts/resident-module-harness').page('calc');q.onLoad({module:'makeup'});q.regionChoice({detail:{regionId:'450800'}});q.moduleCalculate();assert.ok(q.data.quickPlan&&q.data.quickPlan.summary,q.data.error);const original=JSON.stringify(q.data.quickPlan);q.beginResultEdit();assert.equal(q.data.quickPlan,null);assert.equal(q.data.editingResult,true);q.cancelResultEdit();assert.equal(JSON.stringify(q.data.quickPlan),original);q.requestResultReset();const modal=q.calls.at(-1);assert.equal(modal.cancelText,'取消');assert.equal(modal.confirmText,'重置');modal.success({confirm:false});assert.equal(JSON.stringify(q.data.quickPlan),original);});
