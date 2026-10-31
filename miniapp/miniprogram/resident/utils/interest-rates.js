// Resident pension account rates; never reused for employee pension accounts.
const entry=(province,year,percent,url,publisher,detail='')=>({province,year,percent,source:{id:'resident-interest-'+province+'-'+year,name:province+year+'年居民养老记账利率 '+percent.toFixed(2)+'%',url,publisher,checkedAt:'2026-10-31',note:detail}});
const rates={
 '440000':[
  entry('广东',2025,2.49,'https://www.jiangmen.gov.cn/jmshbj/gkmlpt/content/3/3322/post_3322118.html','江门市社会保险基金管理局'),
  entry('广东',2026,2.70,'https://www.shanwei.gov.cn/swrsj/zcfg/shbx/content/post_1268592.html','广东省人社厅、财政厅；汕尾人社公开全文')],
 '450000':[
  entry('广西',2025,3.84,'https://www.gxzf.gov.cn/hdjl/guizaiwen/zskDetail.shtml?id=3ad2fa4e-1775-463c-87ad-9351a665b6a4','钦州市人力资源和社会保障局','复用已核2026-08-13答复；2026-10-31原地址直访失败。'),
  entry('广西',2026,3.76,'https://www.gxzf.gov.cn/hdjl/guizaiwen/zskDetail.shtml?id=3ad2fa4e-1775-463c-87ad-9351a665b6a4','钦州市人力资源和社会保障局','复用已核答复载全区利率；与桂人社发〔2026〕20号转载交叉，原文直访失败。')],
 '360000':[
  ...[[2024,2.16],[2025,3.28],[2026,3.57]].map(([year,rate])=>entry('江西',year,rate,'https://www.jxxf.gov.cn/xfxxxgk/x10008h/202609/048551c1a9e440ba93601dbc82cbc947.shtml','信丰县政府公开信息（来源九江社保）'))],
 '350000':[
  entry('福建',2025,3.16,'https://rst.fj.gov.cn/zw/zfxxgk/zfxxgkml/zyywgz/ldgx/202504/P020250407616970985050.pdf','福建省人社厅、财政厅'),
  entry('福建',2026,3.84,'https://rst.fujian.gov.cn/zw/jgszyzn/zsdw/cxjmshylbx/zcfg_63859/bmwj/202604/t20260402_7118505.htm','福建省人社厅、财政厅')]
};
function get(regionId,asOf){const year=Number(String(asOf).slice(0,4));return (rates[String(regionId).slice(0,2)+'0000']||[]).filter(r=>r.year<=year).sort((a,b)=>b.year-a.year)[0]||null;}
module.exports={rates,get};
