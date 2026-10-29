// Executes actual page event handlers; does not render a simulator or replace phone QA.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function page(kind,store={}){
 let definition;const calls=[],folder=path.join(__dirname,kind==='employee'?'../miniprogram/pages/index':'../miniprogram/flexible/pages/calc'),file=kind==='employee'?'index.js':'calc.js';
 const session={load:k=>store[k]?JSON.parse(JSON.stringify(store[k])):null,save:(k,v)=>store[k]=JSON.parse(JSON.stringify(v))};
 vm.runInNewContext(fs.readFileSync(path.join(folder,file),'utf8'),{Date,Page:p=>definition=p,require:id=>id.endsWith('/session')?session:require(path.resolve(folder,id)),wx:{pageScrollTo:x=>calls.push({scroll:x}),showModal:x=>calls.push({modal:x}),showToast:x=>calls.push({toast:x}),navigateTo:x=>calls.push({navigation:x})}});
 const q={...definition,data:JSON.parse(JSON.stringify(definition.data)),setData(patch){for(const[key,value]of Object.entries(patch)){let d=this.data,ks=key.split('.');for(const k of ks.slice(0,-1))d=d[k];d[ks.at(-1)]=value;}}};q.calls=calls;q.onLoad();return q;
}
module.exports={page};
