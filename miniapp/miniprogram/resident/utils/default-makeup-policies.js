// Reviewed default planning routes. Keep these separate from manually approved records.
const source=(id,name,url,text,publisher)=>({id,name,url,text,publisher,checkedAt:'2026-10-30'});
const lnOld=source('ln-old-tiers','辽宁历年省定缴费档次与补漏规定','https://rst.ln.gov.cn/rst/zxzx/shbz/33D72C36D50448DE98423D326222F5F2/index.shtml','2014年省定100至2000共12档；未按规定逐年缴费可补中断年度，不享补贴。早于2014年度的可补金额未接入本默认模型。','辽宁省人社厅');
const ln2019=source('ln-tier-history','辽宁省人社厅2026答复：2019年档次调整','https://rst.ln.gov.cn/rst/zfxx/fdzdgknr/jyta/szxta/szxssjschy2026n/2026062215343310480/index.shtml','2019年调整为200、300、500、800、1000、2000、3000七档。2026新档不得倒用于旧年。','辽宁省人社厅');
const jlOld=source('jl-old-tiers','吉林2014年省定档次原文','https://xxgk.jl.gov.cn/PDFfile/201812/5349231.pdf','吉政发2014年29号：省定100至2000十二档。2024及以前补费使用旧标准；本默认模型仅自动安排2014年起已知省定档。','吉林省人民政府');
const jlProcedure=source('jl-missing-procedure','吉林补缴中断年度经办规程','https://jlsi.jl.gov.cn/zcfgjjd/qyzgylbx/202006/t20200615_7270616.html','吉社保2018年7号第十四条：可补中断年度，不享相应补贴；原制度过渡另有规定，不与普通补漏混算。','吉林省社会保险事业管理局');
const old=[100,200,300,400,500,600,700,800,900,1000,1500,2000];
const policies={
 '11':{mode:'AT60',applies:({birth})=>birth<(2009-45)*12,sources:[source('bj-default-transition','北京2015以后新参保的原制度年龄组','https://www.beijing.gov.cn/zhengce/zhengcefagui/201905/t20190522_58060.html','京人社居发2014年177号第八条：2015以后新参保、本市户籍在2009-01-01超过45周岁者允许一次多缴至不超15年。本默认仅推导同时满足该更严格出生界限的一组；不猜测外埠迁京日期。','北京市人民政府')],note:'按2015年以后参保且符合本市原户籍年龄组测算，补费采用所选年额参考。'},
 '12':{mode:'AT60',sources:[source('tj-default-lump','天津到龄不足15年一次补足','https://publicservices.hrss.tj.gov.cn/ecdomain/framework/zcydt/fbbafimfopkibboikmfajfanojgaanpa/fadgmmdgopkjbboikmfajfanojgaanpa.do?disp_template=ccnjmfhhefpibbodjemcncephdmpjlhn&fileid=1104&isfloat=1&kbms=1&moduleIDPage=fadgmmdgopkjbboikmfajfanojgaanpa&siteIDPage=zcydt','津政发2014年19号第二十条：距领取不足15年参保者逐年缴费，到龄不足应一次补足。本次补费按所选年档参考，不预测以后调整。','天津市人社局')]},
 '15':{mode:'AT60',sources:[source('nm-default-lump','内蒙古60岁以上未参保可一次缴费','https://chinajob.mohrss.gov.cn/c/2022-09-09/359793.shtml','自治区人社厅答复：60岁以上未参保人员可一次性补缴参保，到账次月享待遇，不享政府缴费补贴。补费按所选年档作情景参考。','人社部中国就业网（自治区人社厅答复）')]},
 '21':{mode:'MISSING',start:2014,tiers:y=>y<2019?old:[200,300,500,800,1000,2000,3000],sources:[lnOld,ln2019],note:'自动补2014年起已接入的漏年；更早可补年度及市级增档尚未纳入。'},
 '22':{mode:'MISSING',start:2014,tiers:(y,p)=>y<=2024?old:p.tiers,sources:[jlOld,jlProcedure],note:'自动补2014年起已知省定档次的漏年；更早年度及地方增档未纳入。'},
 '41':{mode:'AT60',sources:[source('henan-procedure-lump','河南经办规程：按补缴当年标准补足','https://www.linzhou.gov.cn/2025/02-24/3611090.html','省城乡居民养老经办规程第二十六条：不足年限可补缴，按补缴当年标准，不享政府缴费补贴。','林州市政府公开河南省经办规程')]},
 '62':{mode:'MISSING',start:2014,tiers:(y,p)=>p.tiers,sources:[source('gs-default-missing','甘肃可按当前档次补未缴年度','https://app.www.gov.cn/govdata/gov/202301/20/496435/article.html','符合省实施办法第五条的补缴，可按未缴年度或当前档次选择；补未缴旧年无补贴，足额缴费后次月起领。本默认从2014年起安排，未接更早年度。','中国政府网（甘肃省政策公开）')],note:'按符合补缴条件测算，补2014年起漏年；原制度更早年度另有适用条件。'}
};
const cities={
 '320500':{mode:'AT60',sources:[source('suzhou-default-lump','苏州到龄不足规定年限一次补缴','https://www.suzhou.gov.cn/szsrmzf/gbzfgfxwj/202111/7841037c40ea470794ebf15097f87e04.shtml','苏府规字2021年11号修订办法第八条：普通累计不少于15年，不满规定年限应一次补缴。补费按用户所选年额参考；只接苏州，不扩为全江苏规则。','苏州市人民政府')]},
 '360100':{mode:'AT60',sources:[source('nc-default-lump','南昌60岁不足年限可补往年','https://www.nc.gov.cn/ncszf/cjwta/202311/427706d79ecb479694fd6698b88684bd.shtml','市政府待遇申领问答：60岁时可以一次补缴往年，按当年设定缴费档次自选。只作用南昌，不推为全江西实施细则。','南昌市人民政府')]},
 '650100':{mode:'MISSING',start:2014,tiers:(y,p)=>p.tiers,sources:[source('urumqi-default-missing','乌鲁木齐补漏可选当前档次','https://www.wlmq.gov.cn/wlmqs/c119063/202312/531b6d607cbc45c5843eab1035fa3121.shtml','乌人社规2023年2号第三条：补未缴年度可按原或当前档次，旧年无补贴，核定待遇后不许补。文件2023-11-30起有效5年；本次在有效期内即时补往年。','乌鲁木齐市人社局')],note:'按可补2014年起年度测算，只在乌鲁木齐适用，不套自治区其他地区或兵团。',validThrough:'2028-11'}
};
function get(id){id=String(id);return cities[id]||policies[id.slice(0,2)]||null;}
module.exports={get,policies,cities};
