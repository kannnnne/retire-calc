const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function browser(){
 const dir=path.join(__dirname,'../miniprogram/resident/pages/calc'),sessions={};
 const copy=x=>JSON.parse(JSON.stringify(x));
 return ()=>{let definition;vm.runInNewContext(fs.readFileSync(path.join(dir,'calc.js'),'utf8'),{Date,wx:{pageScrollTo(){}},require:name=>name.endsWith('/session')?{load:key=>sessions[key]?copy(sessions[key]):null,save:(key,value)=>{sessions[key]=copy(value);}}:require(path.resolve(dir,name)),Page:p=>definition=p});
 const p={...definition,data:copy(definition.data),setData(values){for(const[key,value]of Object.entries(values)){const keys=key.split('.');let target=this.data;for(const k of keys.slice(0,-1))target=target[k];target[keys.at(-1)]=value;}}};p.onLoad();return p;};
}
test('居民切走再进入保留已算结果、所选档与展开状态，与职工交互一致',()=>{
 const open=browser(),p=open();p.setData({'form.age':'58','form.years':'8','form.pastAnnual':'600'});p.calculate();assert.ok(p.data.result);p.chooseFuture({currentTarget:{dataset:{annual:4800}}});const monthly=p.data.display.monthly,base=p.data.baseline.annual;p.setData({compare:true,showNotes:true});p.onUnload();
 const next=open();assert.ok(next.data.result);assert.equal(next.data.display.monthly,monthly);assert.equal(next.data.result.chosen.annual,4800);assert.equal(next.data.form.tier,4800);assert.equal(next.data.baseline.annual,base);assert.equal(next.data.form.age,'58');assert.equal(next.data.form.years,'8');assert.equal(next.data.form.pastAnnual,'600');assert.equal(next.data.compare,true);assert.equal(next.data.showNotes,true);assert.equal(next.data.planOptions.find(x=>x.annual===4800).monthly,monthly);next.edit();assert.equal(next.data.result,null);assert.equal(next.data.form.age,'58');assert.equal(next.data.form.pastAnnual,'600');
});

test('修改后未重算便离开，重进仍为填写页，不把旧结果复活',()=>{const open=browser(),p=open();p.calculate();assert.ok(p.data.result);p.edit();p.input({currentTarget:{dataset:{key:'age'}},detail:{value:'58'}});p.onUnload();const next=open();assert.equal(next.data.result,null);assert.equal(next.data.display,null);assert.equal(next.data.form.age,'58');next.calculate();assert.equal(next.data.error,'');assert.ok(next.data.result);});
test('重新填写恢复默认，清除特殊缴费和旧方案，离开再进仍可直接计算',()=>{
 const open=browser(),p=open();p.calculate();p.setData({'form.noCollective':'yes','form.selfCollectiveTier':4800,'form.segments':[{start:'2021',end:'2025',annual:600}],more:true,showExtra:true});p.reset();assert.equal(p.data.result,null);assert.equal(p.data.restored,false);assert.equal(p.data.form.age,'55');assert.equal(p.data.form.years,'5');assert.equal(p.data.form.pastAnnual,'360');assert.equal(p.data.form.tier,360);assert.equal(p.data.form.selfCollectiveTier,undefined);assert.equal(p.data.form.segments,undefined);assert.equal(p.data.showExtra,false);p.onUnload();const next=open();next.calculate();assert.equal(next.data.error,'');assert.ok(next.data.result);assert.equal(next.data.result.chosen.annualTotal,360);
});

test('居民年龄与出生月切换保留两种输入，计算采用当前选中的方式',()=>{const p=browser()();p.setData({'form.age':'58','form.birth':'1971-10','form.asOf':'2026-10'});p.ageMode({currentTarget:{dataset:{value:'birth'}}});assert.equal(p.data.form.ageOnly,false);p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.age,55);p.edit();p.ageMode({currentTarget:{dataset:{value:'age'}}});assert.equal(p.data.form.age,'58');p.calculate();assert.equal(p.data.error,'');assert.equal(p.data.result.age,58);});
