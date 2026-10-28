const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../miniprogram');
function environment(){
 let stack=['/resident/pages/home/home','/resident/pages/basic/basic'],definition,unloaded=0;
 const api={reLaunch({url}){unloaded+=stack.length;stack=[url];},navigateTo({url}){stack.push(url);},redirectTo({url}){stack[stack.length-1]=url;}};
 function load(file,kind){const dir=path.dirname(path.join(root,file));vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),{require:id=>require(path.resolve(dir,id)),[kind]:v=>definition=v,wx:api,getCurrentPages:()=>stack.map(route=>({route}))});return definition;}
 return {api,load,get stack(){return stack;},get unloaded(){return unloaded;}};
}
test('居民子页切任何主菜单都清除旧父页，当前项也能修复残留栈',()=>{
 for(const[key,url]of Object.entries({home:'/pages/home/home',employee:'/pages/index/index',flexible:'/flexible/pages/calc/calc',resident:'/resident/pages/home/home'})){
 const e=environment(),c=e.load('components/tool-nav/index.js','Component');
 c.methods.go.call({properties:{active:key,residentHub:false}},{currentTarget:{dataset:{key}}});
 assert.deepEqual(e.stack,[url]);assert.equal(e.unloaded,2);
 c.methods.go.call({properties:{active:key,residentHub:false}},{currentTarget:{dataset:{key}}});assert.equal(e.unloaded,2);
 }
});
test('首页卡片和其他计算也回到单页根路径，政策详情仍可正常返回',()=>{
 const e=environment(),home=e.load('pages/home/home.js','Page');home.open({currentTarget:{dataset:{id:'employee'}}});assert.deepEqual(e.stack,['/pages/index/index']);
 const basic=e.load('resident/pages/basic/basic.js','Page');basic.home();assert.deepEqual(e.stack,['/resident/pages/home/home']);
 basic.policy.call({data:{form:{regionId:'450800',localArea:''}}});assert.equal(e.stack.length,2);assert.match(e.stack.at(-1),/policy/);e.stack.pop();assert.equal(e.stack[0],'/resident/pages/home/home');
});
test('清空页面返回栈不清空应用内存中的输入和结果',()=>{
 const saved=global.getApp,app={globalData:{}};global.getApp=()=>app;
 try{const session=require('../miniprogram/utils/session'),nav=require('../miniprogram/utils/root-navigation');session.save('resident-basic',{form:{age:'59',tier:6000},result:{monthly:350}});let stack=['menu','basic'];nav.open('home',{reLaunch({url}){stack=[url];}});assert.equal(stack.length,1);assert.deepEqual(session.load('resident-basic'),{form:{age:'59',tier:6000},result:{monthly:350}});}finally{if(saved)global.getApp=saved;else delete global.getApp;}
});
