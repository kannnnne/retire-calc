const fs=require('node:fs'),path=require('node:path');
const registry=require('../miniprogram/utils/employee-registry'),legacy=require('../miniprogram/utils/city-policies');
function audit(){
 const errors=[],ids=new Set(),rows=registry.provinces.map(p=>{
  let ready=0;for(const c of p.cities){if(ids.has(c.id))errors.push('重复行政码 '+c.id);ids.add(c.id);const r=c.employee;if(r.status==='READY'){ready++;if(!r.legacy){for(const k of ['min','max','pensionBase','indexWage'])if(!Number.isFinite(r[k])||r[k]<=0)errors.push('缺参数 '+c.id+' '+k);if(r.min>r.max)errors.push('上下限颠倒 '+c.id);if(!r.sources?.length||r.sources.some(s=>!s.id||!s.text||!/^https?:\/\//.test(s.url)))errors.push('缺来源 '+c.id);}if(r.employeeOnly&&(!r.referenceLabel.includes('2025年参数参考')||r.parameterStatus!=='REFERENCE'))errors.push('历史参数未标明 '+c.id);}else if(r.status!=='PENDING'||!r.reason||r.pensionBase!==undefined)errors.push('跳过地区生成了参数 '+c.id);}
  return {id:p.id,name:p.name,total:p.cities.length,ready,pending:p.cities.length-ready,reason:ready?'':p.cities[0].employee.reason};
 });
 for(const c of legacy.cities){const r=registry.capability(c.id);for(const k of ['status','min','max','pensionBase','indexWage','rule','legacy','nonLocalOnly'])if(r[k]!==c.employee[k])errors.push('旧地区改变 '+c.id+' '+k);}
 return {provinces:rows.length,selectionEntries:ids.size,ready:rows.reduce((n,r)=>n+r.ready,0),readyProvinces:rows.filter(r=>r.ready).length,pending:rows.reduce((n,r)=>n+r.pending,0),rows,errors};
}
function report(){const a=audit(),lines=['# 职工养老全国接入记录（2.15.0）','','本轮截止：2026-10-22。只扩单位职工，复用现有表单、结果、方案切换和地区选择。居民仍369项，灵活就业仍原40城。', '',`大陆31省369个选择项：可算${a.readyProvinces}省${a.ready}项，跳过${a.provinces-a.readyProvinces}省${a.pending}项。可选择不等于已可算，不宣称全国已全开。`,'','新增天津、河北、辽宁、吉林、福建、湖南、云南、宁夏省级普通参考；浙江、四川、陕西从已有城市规则扩至省内城市，保留原40城参数。新八省沿用2025年历史参数，明确标注年份，不冒充2026年实际申报标准。河北为京报网转载政府通知全文；宁夏读取了官网搜索正文，原站直访405，均保留来源状态。吉林原缴费有效期至2026年6月，之后仅为历史参数参考；排除农垦企业。','','沈阳、大连、长春采用已核不同计发额；吉林年度计发额÷12换成月额。缴费工资、缴费上下限、待遇计发基数分别保存；天津和福建未来指数工资由300%缴费上限÷3近似，不改用户历史平均指数。','','## 覆盖与跳过','','|省份|可算／选择项|当前范围或缺项|','|---|---:|---|'];
 for(const p of registry.provinces){const row=a.rows.find(r=>r.id===p.id),r=p.cities[0].employee;lines.push(`|${p.name}|${row.ready}／${row.total}|${row.ready?r.referenceLabel||'原有规则':row.reason}|`);}
 lines.push('','## 参数与来源','','以下为本轮新增省份，不是现行全国标准汇总。既有省份沿用原有记录。','','|省份|缴费下限／上限|计发基数（月）|未来指数工资|','|---|---:|---:|---:|');
 const profiles=require('../miniprogram/utils/national-employee-policies').profiles;
 for(const [id,r]of Object.entries(profiles)){const p=registry.provinces.find(p=>p.id===id);lines.push(`|${p.name}|${r.min}／${r.max}|${Number(r.pensionBase.toFixed(4))}|${Number(r.indexWage.toFixed(4))}|`);}
 const sources=new Map();for(const r of Object.values(profiles))for(const s of r.sources)sources.set(s.id,s);
 for(const s of sources.values())lines.push('',`- [${s.name}](${s.url})：${s.text}`);
 lines.push('','## 停止规则与验证','','资料先复用。每省最多两条公开检索路径（缴费及计发综合通知、缺少计发额的定向查找），沿已出现原文链接核对；达到本轮范围即记录缺项停止，不自动追加逐市研究。未取得参数不借邻省，不以“全国统筹”推导各地金额相同。','','普通参考只算基础和个人账户两项，不核定跨省领取地资格，不扩视同缴费、地方附加、历史过渡或一次补足。全国退休年龄和最低缴费年限继续复用原国家规则。','','自动测试覆盖独立数值、年度和城市差异、158地区默认填写计算、改方案／修改／重填、旧会话、未开放拦截、来源隔离及8%成本与入账。编译执行scripts/build-dev.ps1，不执行GUI、手机实测、CLI上传或公众平台操作。','','用户验收：在开发者工具编译，职工入口选天津或福建直接计算、切方案和修改；选山西等跳过地区应提示未开放，不能显示上一地区金额。手机及上传仍由用户操作。','');
 return {audit:a,markdown:lines.join('\n')};
}
if(require.main===module){const r=report();fs.writeFileSync(path.join(__dirname,'../docs/national-employee-progress.md'),r.markdown);console.log(JSON.stringify(r.audit));if(r.audit.errors.length)process.exitCode=1;}
module.exports={audit,report};
