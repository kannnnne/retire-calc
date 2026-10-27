// Additional layout/interaction fixtures. Only the report's explicit GUI subset was clicked.
const fs=require('node:fs'),path=require('node:path'),{audit}=require('./resident-ux-cases');
const cases=[
 {id:'U01',regionId:'450100',age:47,years:12,annual:200,paid:'unknown',title:'南宁47岁，12年低档，连续比较中高档'},
 {id:'U02',regionId:'440100',age:62,years:0,annual:360,never:true,title:'广州62岁未参保，正常年缴参考'},
 {id:'U03',regionId:'450100',age:61,years:6,annual:500,segments:[['2015','2017','500'],['2024','2026','1000']],title:'南宁61岁，两段不同档次及中间漏缴'},
 {id:'U04',regionId:'450300',age:54,years:13,annual:1000,title:'桂林54岁，已交13年，剩余正常缴费'},
 {id:'U05',regionId:'450800',age:58,years:11,annual:1000,title:'贵港58岁，11年1000档，比较历史补费'},
 {id:'U06',regionId:'450100',age:64,years:5,annual:500,monthly:'100',title:'南宁64岁，仅记得每月100，先看参考'}
];
const report=audit(cases),out=path.join(__dirname,'../output/resident-ui-cases.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));
console.log(JSON.stringify({version:report.version,safetyFailures:report.safetyFailures,cases:report.cases.map(c=>({id:c.id,title:c.title,view:c.route&&c.route.view,error:c.runnerError||c.route&&c.route.error||c.preview&&c.preview.error,futureOnly:c.futureOnly,monthly:c.ordinary&&c.ordinary.monthly}))},null,2));if(report.safetyFailures.length)process.exitCode=1;
