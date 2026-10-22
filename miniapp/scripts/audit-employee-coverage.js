const fs=require('node:fs'),path=require('node:path');
const registry=require('../miniprogram/utils/employee-registry'),legacy=require('../miniprogram/utils/city-policies');
function audit(){
 const errors=[],ids=new Set(),rows=registry.provinces.map(p=>{
  let ready=0;for(const c of p.cities){if(ids.has(c.id))errors.push('重复行政码 '+c.id);ids.add(c.id);const r=c.employee;if(r.status==='READY'){ready++;if(!r.legacy){for(const k of ['min','max','pensionBase','indexWage'])if(!Number.isFinite(r[k])||r[k]<=0)errors.push('缺参数 '+c.id+' '+k);if(r.min>r.max)errors.push('上下限颠倒 '+c.id);if(!r.sources?.length||r.sources.some(s=>!s.id||!s.text||!/^https?:\/\//.test(s.url)))errors.push('缺来源 '+c.id);}if(r.employeeOnly&&(!Number.isInteger(r.year)||!Number.isInteger(r.contributionYear)||!r.referenceLabel.includes(String(r.year))||!r.referenceLabel.includes(String(r.contributionYear))||r.parameterStatus!=='REFERENCE'))errors.push('历史参数未标明 '+c.id);}else if(r.status!=='PENDING'||!r.reason||r.pensionBase!==undefined||r.min!==undefined||r.indexWage!==undefined)errors.push('跳过地区生成了参数 '+c.id);}
  return {id:p.id,name:p.name,total:p.cities.length,ready,pending:p.cities.length-ready,reason:ready?'':p.cities[0].employee.reason};
 });
 for(const c of legacy.cities){const r=registry.capability(c.id);for(const k of ['status','min','max','pensionBase','indexWage','rule','legacy','nonLocalOnly'])if(r[k]!==c.employee[k])errors.push('旧地区改变 '+c.id+' '+k);}
 return {provinces:rows.length,selectionEntries:ids.size,ready:rows.reduce((n,r)=>n+r.ready,0),readyProvinces:rows.filter(r=>r.ready).length,pending:rows.reduce((n,r)=>n+r.pending,0),rows,errors};
}
function report(){const a=audit(),lines=['# 职工养老全国接入记录（2.16.0）','','本轮截止：2026-10-22。只扩单位职工，复用现有表单、结果、方案切换和地区选择。居民仍369项，灵活就业仍原40城。', '',`大陆31省369个选择项：可算${a.readyProvinces}省${a.ready}项，未开放${a.pending}项（${a.provinces-a.readyProvinces}省全部暂缓，另山东菏泽单独暂缓）。可选择不等于已可算，不宣称全国已全开。`,'','本轮在原15省158项基础上新增山西、内蒙古、黑龙江、江苏、安徽、江西、山东（不含菏泽）、贵州、甘肃、青海，共122项。原40城参数不变。其他省份保留现有参考口径，不因本轮追溯升级。','','新十省除甘肃外均采用2025年历史参考；甘肃为2024年待遇／2025年缴费参考，明确混合年份，不冒充2026年实际申报标准。山西、江西取得通知全文转载，山东为原通知PDF公开副本；江苏、内蒙古部分证据是官网搜索正文或官方计算实例。所有来源状态、推导过程保留，不把第三方托管写成原政府网站。','','山东通知明确7831元不含菏泽，单独拦截并清除该地区金额参数，不以其余15市为代价停开全省。贵州按省统一全口径规则和年度工资通知推导，青海与黑龙江普通60%—300%缴费范围由工资换算；安徽、江苏未来指数工资按300%上限÷3近似。缴费工资、范围、待遇计发基数分开保存。','','先前已接的沈阳、大连、长春差异保留；吉林年计发额÷12，缴费有效期至2026年6月，之后仅作历史参考，排除农垦企业。','','## 覆盖与跳过','','|省份|可算／选择项|当前范围或缺项|','|---|---:|---|'];
 for(const p of registry.provinces){const row=a.rows.find(r=>r.id===p.id),r=p.cities.find(c=>c.employee.status==='READY')?.employee;const pending=p.cities.filter(c=>c.employee.status==='PENDING').map(c=>c.name+'：'+c.employee.reason).join('；');lines.push(`|${p.name}|${row.ready}／${row.total}|${row.ready?(r.referenceLabel||'原有规则')+(row.pending?'；'+pending:''):row.reason}|`);}
 lines.push('','## 参数与来源','','以下为本轮新增省份，不是现行全国标准汇总。既有省份沿用原有记录。','','|省份|缴费下限／上限|计发基数（月）|未来指数工资|','|---|---:|---:|---:|');
 const profiles=require('../miniprogram/utils/national-employee-policies').profiles;
 for(const [id,r]of Object.entries(profiles)){const p=registry.provinces.find(p=>p.id===id);lines.push(`|${p.name}|${r.min}／${r.max}|${Number(r.pensionBase.toFixed(4))}|${Number(r.indexWage.toFixed(4))}|`);}
 const sources=new Map();for(const r of Object.values(profiles))for(const s of r.sources)sources.set(s.id,s);
 for(const s of sources.values())lines.push('',`- [${s.name}](${s.url})：${s.text}`);
 lines.push('','## 本轮检索与停止边界','','用户本轮明确授权“可以检索多几轮”，允许超过旧两条检索路径限制。先复用资料，再补找正式通知、政府镜像、政务账号全文及公开文件副本；不因找到汇编数字就宣称核实。单个地区仍不无限逐县研究。','','剩余六省：河南已找到缴费范围，6738元计发额只有网文线索；湖北三组缴费已找到，但待遇有市级差异；海南尚缺8188元缴费工资等于计发工资的正式确认；重庆8240元仅取得裁判转载线索，计发原通知与指数上限待核；西藏人社明确另有高原补贴，未做完整适配；新疆计发口径和兵团独立规则待核。原文失败不等于没有数据，也不拿网上预测值、工伤工资或邻省标准代替。','','普通参考只算基础和个人账户两项，不核定跨省领取地资格，不扩视同缴费、地方附加、历史过渡或一次补足。全国退休年龄和最低缴费年限继续复用原国家规则。参考年份较旧、指数未知及未来调标都会影响实际金额，不能承诺仅差几十元。','','自动测试覆盖独立数值、混合年份、城市例外、280地区默认填写计算、改方案／修改／重填、旧会话、未开放拦截、来源隔离及8%成本与入账。编译执行scripts/build-dev.ps1，不执行GUI、手机实测、CLI上传或公众平台操作。','','用户验收：在开发者工具编译，职工入口选江苏、江西或甘肃计算、切方案和修改；山东济南可算、菏泽提示未开放，切换不得显示上一地区金额；甘肃来源显示2024年待遇／2025年缴费。手机及上传由用户操作。','');
 return {audit:a,markdown:lines.join('\n')};
}
if(require.main===module){const r=report();fs.writeFileSync(path.join(__dirname,'../docs/national-employee-progress.md'),r.markdown);console.log(JSON.stringify(r.audit));if(r.audit.errors.length)process.exitCode=1;}
module.exports={audit,report};
