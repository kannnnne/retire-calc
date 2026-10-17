const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../miniprogram'),brand=require('../miniprogram/utils/brand'),appPath=path.join(root,'app.json'),app=JSON.parse(fs.readFileSync(appPath,'utf8'));
if(!brand.confirmed||!brand.name||brand.name.trim()!==brand.name)throw Error('请先确认并填写小程序正式名称，再将 confirmed 设为 true');
app.window.navigationBarTitleText=brand.name;fs.writeFileSync(appPath,JSON.stringify(app,null,2)+'\n');
const pages=[...app.pages,...app.subPackages.flatMap(p=>p.pages.map(x=>p.root+'/'+x))];for(const page of pages){const file=path.join(root,page+'.json'),data=JSON.parse(fs.readFileSync(file,'utf8'));data.navigationBarTitleText=brand.name;fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');}
process.stdout.write('首页、分享和全部导航标题统一为：'+brand.name+'\n');
