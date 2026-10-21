// One profile per province; do not infer municipality pensions or make-up eligibility.
const checkedAt='2026-10-21';
const source=(id,name,url,text,publisher='福建省人民政府／福建省人力资源和社会保障厅')=>({id,name,url,text,publisher,checkedAt});
const fujian={status:'READY',rule:'FUJIAN_ORDINARY',provincial:true,base:190,baseYear:2025,effectiveFrom:'2026-01',tiers:[200,300,400,500,600,700,800,1000,1500,2000,2500,3000],subsidies:[40,50,60,70,80,90,100,120,140,160,180,200],extraYear:0,referenceLabel:'福建省级参考 · 未计市县加发',referenceText:'基础按已核2025年7月省最低190元，年缴按省定12档及对应补贴；市县额外提高、长缴及高龄加发暂不计。普通逐年交满15年、满60岁起领；历史补缴与过渡资格另核，不默认人人60岁可补足。',sources:[
 source('fj-resident-tier','福建省定居民养老12档与缴费补贴','https://rst.fujian.gov.cn/wz/cjwt/cxylbx/202009/t20200904_5380764.htm','省人社问答列2019年起12档：200/300/400/500/600/700/800/1000/1500/2000/2500/3000元，对应40/50/60/70/80/90/100/120/140/160/180/200元。仅省级档，未当作各市全部可选档。'),
 source('fj-resident-base','福建居民养老待遇申领及省级最低标准','https://www.fujian.gov.cn/nrrh/srst/202309/t20230922_6262907.htm','现页明确2025年7月1日起省定最低190元；市县可提高。按月申领以满60且按规定缴费、未享受其他基本养老待遇等条件为前提，不赋予任意补缴权限。'),
 source('fj-resident-formula','福建城乡居民保参保登记与账户计算说明','https://www.fujian.gov.cn/nrrh/srst/202309/t20230922_6262785.htm','省政府省人社办事指南：个人账户养老金为账户储存额除以139；登记和领取办理各有条件。历史本人缴费估算不虚构历年补贴和利息。')],paymentNote:'以后正常年度按所选省级档交。过去漏年、提档及原制度过渡须先核具体适用条件，本页先给逐年方案，不把当前档套到所有旧年。'};
const hebei={status:'READY',rule:'HEBEI_ORDINARY',provincial:true,base:188,baseYear:2025,effectiveFrom:'2026-01',tiers:[200,300,500,1000,3000,5000,8000],subsidies:[30,45,60,75,90,105,120],extraYear:0,referenceLabel:'河北省级参考 · 未计市县加发',referenceText:'按已核2025省级最低188元、普通7档及补贴计算。未计市县另加金额、长缴和高龄加发；未来调标及利息不预测。普通逐年交满15年、满60岁起领，补缴资格及历史档次另核。',paymentNote:'未来年缴按省级7档比较；以前断缴或到龄补足要核实际可补年度和标准，不将年龄或缺年数直接当成补缴许可。',sources:[
 source('hb-resident-tier','河北省级7档与缴费补贴经办答复','https://www.sjz.gov.cn/zmhd/zfxxdetail.jsp?id=507031','石家庄社保经办公开答复列我省7档200/300/500/1000/3000/5000/8000，对应补贴30/45/60/75/90/105/120元；本人缴费与补贴均入个人账户。此为经办答复，不冒称规范性原文或完整地方待遇。','石家庄市人民政府／社保经办答复'),
 source('hb-resident-base','河北十四五财政发布会：居民基础额188元','https://www.xiongan.gov.cn/20251101/46ab4b534b5a4c88902cfaeb1e761f7f/c.html','2025年10月31日省政府新闻办发布会报道，明确全省居民基础养老金最低标准已由113提高至188元。采用2025省级最低，不将其当全市县完整额。','中国雄安官网（河北日报转述省政府新闻办发布会）') ]};
const liaoning={status:'READY',rule:'LIAONING_ORDINARY',provincial:true,base:174,baseYear:2025,effectiveFrom:'2026-01',tiers:[200,300,500,800,1000,2000,3000,4000,5000],subsidies:[40,50,70,100,120,140,160,170,180],extraYear:0,ageExtras:[[65,5],[80,10]],referenceLabel:'辽宁省级参考 · 未计市县加发',referenceText:'基础按已核2025最低174元，2026年省定9档及最低补贴；65至79岁加5元、80岁起加10元。连续超15年每年加2元需要连续记录，本页未确认连续性时不加；未计市县提高及未来调标。',paymentNote:'当年正常缴费有补贴，中断年度补缴无补贴。旧年档次及到龄补足资格另核；不把2026新增4000/5000元倒套旧年。',sources:[
 source('ln-resident-tier-2026','辽宁2026居民缴费9档及最低补贴通知','https://www.ln.gov.cn/web/zwgkx/lnsrmzfgb/2025n/qk/2025n_dessq/bmwj/2025112009203925536/index.shtml','2026年1月1日起9档200/300/500/800/1000/2000/3000/4000/5000，对应最低补贴40/50/70/100/120/140/160/170/180元，各市不再自行调整档次。中断缴费补缴无补贴；困难100元档不作普通默认。','辽宁省人民政府公报（省人社、财政、税务通知）'),
 source('ln-resident-base-2026-reply','辽宁省人社2026提案答复：基础额与倾斜待遇','https://rst.ln.gov.cn/rst/zfxx/fdzdgknr/jyta/szxta/szxssjschy2026n/2026062215343310480/index.shtml','辽人社提2026年3号，2026年6月22日。明确2025省最低174元；65—79岁加5元、80岁以上加10元。连续超15年每年增2元，不把不连续累计年数直接当符合；本页暂不自动加入该连续奖励。','辽宁省人力资源和社会保障厅') ]};
const nationalFloor=source('national-resident-floor-2025','全国居民基础养老金2025已核最低标准','https://www.mohrss.gov.cn/wap/xw/rsxw/202604/t20260430_575291.html','人社部2026年4月30日说明：全国最低标准已提高至143元，2026年将再提高20元。本参考只采用已明确的2025年143元，不把计划增额自动加入，也不冒充各省或城市完整金额。','人力资源和社会保障部');
const limited=(name,rule,tiers,subsidies,sources,note)=>({status:'READY',rule,provincial:true,parameterStatus:'NATIONAL_FLOOR_REFERENCE',base:143,baseYear:2025,effectiveFrom:'2026-01',tiers,subsidies,extraYear:0,referenceLabel:name+'缴费 · 全国下限参考',referenceText:'本地完整基础额尚未核齐，暂按已核2025全国最低143元计算，不是'+name+'实际待遇；未计地方加发、长缴、高龄及未来调标。缴费采用已核本地档次及补贴。'+note,paymentNote:'先按普通逐年交满15年、满60岁领取安排。历史补缴和到龄补足要核个人资格；当前年档不能倒套所有旧年。',sources:[...sources,nationalFloor]});
const henan=limited('河南','HENAN_ORDINARY',[200,300,400,500,600,700,800,900,1000,1500,2000,2500,3000,4000,5000],[30,40,50,60,80,100,120,140,160,190,220,250,280,310,340],[
 source('hn-resident-tier','河南待遇机制及省级缴费补贴','https://shbx.hrss.henan.gov.cn/hnsi/zhengce/fagui/webinfo/1572070561756560.htm','豫人社2019年3号：普通最低200元，按200至5000元15档给予30至340元对应补贴；补漏年无补贴。连续满15年或实际累计20年后的长缴激励需记录，本参考不自动加入。','河南省社会保险中心（省人社、财政实施意见）'),
 source('hn-resident-formula','河南省社保中心：居民养老待遇组成','https://shbx.hrss.henan.gov.cn/hnsi/zhengce/cjwtjd/cxjmjbylbx/webinfo/2022/12/1671896668894791.htm','2024年12月问答明确基础与个人账户组成，账户全部储存额除以139，不是只发139个月。','河南省社会保险中心')
],'河南地方基础额、原制度条件与缴费激励需按记录另核。');
const chongqing=limited('重庆','CHONGQING_ORDINARY',[200,300,400,500,800,1000,2000,3000,4000,5000,6000,7000,8000],[40,50,60,70,100,120,140,160,175,200,200,200,200],[
 source('cq-resident-tier-2026','重庆2026缴费13档和政府补贴','https://rlsbj.cq.gov.cn/zczxwdk/ywfl/ylbx/202607/t20260716_15828027.html','2026年调整为200/300/400/500/800/1000/2000/3000/4000/5000/6000/7000/8000，对应40/50/60/70/100/120/140/160/175/200/200/200/200元。替换2022旧13档，不把600/700/900/1500当现行普通可选档。','重庆市人力资源和社会保障局'),
 source('cq-resident-qualification','重庆居民养老缴费年限与领取条件说明','https://www.cq.gov.cn/zwgk/zfxxgkml/hygq/202308/t20230822_12262020.html','补缴与户籍地试点之月距60岁的年限有关；距60岁15年及以上须累计不少于15年，不从现在年龄直接开放一次补足。原试点与个人记录需核对。','重庆市人民政府')
],'原试点人员可能适用不同年限，不把本页逐年方案当唯一领取途径。');
function provincial(name,rule,base,tiers,subsidies,sources,note,extras={}){return {status:'READY',rule,provincial:true,base,baseYear:2025,effectiveFrom:'2026-01',tiers,subsidies,extraYear:0,referenceLabel:name+'省级参考 · 未计市县加发',referenceText:'采用已核2025省级最低'+base+'元及普通缴费档次、补贴；未计其他市县提高和未来调标。'+note,paymentNote:'先比较未来正常年缴方案，历史补缴和到龄补足须核个人适用条件，不能把当前档套到所有旧年。',sources,...extras};}
const anhui=limited('安徽','ANHUI_ORDINARY',[200,300,400,500,600,700,800,900,1000,1500,2000,3000,4000,5000,6000,9000],[40,50,60,70,80,90,100,110,120,150,200,200,200,200,200,200],[
 source('ah-resident-tier-2026','安徽2026新增9000元及全省16档通知','https://www.ahshitai.gov.cn/OpennessContent/show/1710420.html','皖人社秘2025年188号转发：2026年1月起原15档增9000元，2000元及以上补贴200元；其他补贴按皖人社发2019年15号。此为省级通知转载，不借石台额外待遇。','石台县人民政府（省级通知公开转载）'),
 source('ah-resident-subsidy','安徽2020省级实施方案与最低补贴','https://www.ahjd.gov.cn/Content/show/1117092.html','省级实施方案列普通15档补贴：200至1000各档40/50/60/70/80/90/100/110/120，1500补150，2000及以上补200；2026新增高档沿用200。','旌德县人民政府（省级实施方案）')
],'采用省级最低缴费补贴，不借某县较高补贴；本地基础额待核。');
const jiangxi=limited('江西','JIANGXI_ORDINARY',[300,400,500,600,700,800,900,1000,1500,2000,3000,4000,5000,6000],[40,50,60,65,70,75,80,85,90,95,100,150,190,230],[
 source('jx-resident-rule','江西省社保政策问答：14档及补贴','https://www.jxln.gov.cn/lnxxxgk/xzshbxb/202511/aad9dc315efb4b0da3fb662105cfef3c.shtml','2022年6月起14档300至6000；补贴40/50/60/65/70/75/80/85/90/95/100/150/190/230。满60累计15年或原制度逐年缴清等条件分别适用，不能仅按现在60岁认定补足资格。','龙南市政府公开江西省社保政策问答')
],'赣州地方225元不套全省；本地完整基础额与长缴加发待核。');
const hunan=provincial('湖南','HUNAN_ORDINARY',176,[300,400,500,600,700,800,900,1000,1500,2000,2500,3000,4000,5000,6000],[40,40,60,60,60,60,60,60,60,60,60,60,100,100,100],[
 source('hun-resident-tier','湖南2023省级15档及新增高档补贴','https://rst.hunan.gov.cn/xxgk/gzdt/zwdt/202312/t20231230_32615616.html','省人社2023年12月30日解读：普通15档300至6000，4000至6000各补100；困难100元不作普通档。地方可另增加补贴。','湖南省人力资源和社会保障厅'),
 source('hun-resident-subsidy','湖南省政府2021居民养老制度解读','https://www.hunan.gov.cn/hnyw/sy/hnyw1/202101/t20210109_14135853.html','普通缴费300/400各补40，500及以上基础补贴60；后发2023高三档补100优先。','湖南省人民政府'),
 source('hun-resident-base','湖南2025财政民生发布：基础最低176元','https://czt.hunan.gov.cn/czt/wwyw/mtjj/202511/t20251124_33854274.html','省财政厅2025年11月发布民生报道明确城乡居民基础养老金最低标准提高至176元；不是2023文件计划到2025的148元。','湖南省财政厅')
],'未确认历史正常缴费记录，不自动计长缴额外奖励。');
const yunnan=limited('云南','YUNNAN_ORDINARY',[300,400,500,600,700,800,900,1000,1500,2000,3000,4000,5000,6000,7000,8000,9000,10000],[35,40,60,72,84,96,108,120,180,240,240,240,240,240,240,240,240,240],[
 source('yn-resident-range-2026','云南2026最低300与最高10000公告','https://www.yncj.gov.cn/cjxzfxxgk/gwyxxwj/20251225/1641003.html','省三部门2025年第19号公告，2026年最低300补35、最高10000；不继续提供旧年200普通档。','澄江市政府转载云南省人社等三部门公告'),
 source('yn-resident-tier-2026','云南2026完整18档及对应补贴','https://www.dhms.gov.cn/mgz/Web/_F0_0_6K41ZIV851B5F31CFE4B49E1AE.htm','2026省级18档300至10000；300/400补35/40，500至1500按所选额12%，2000及以上补240。不把政府补贴冲抵本人费用。','芒市政府2026居民养老征缴说明')
],'完整地方基础额待核，不由丧葬补助或别市表格反推全省待遇。');
const guizhou=provincial('贵州','GUIZHOU_ORDINARY',178,[300,400,600,1000,2000,3000,4000,5000,6000],[30,40,60,100,200,300,300,300,300],[
 source('gz-resident-budget-2026','贵州2026省人社预算引用现行档次与基础标准','https://rst.guizhou.gov.cn/zwgk/zdlyxx/czxx/202603/P020260302334714622935.pdf','PDF第106—107页引用黔人社发2025年25号：普通300/400/600/1000/2000补10%，3000/4000/5000/6000各补300；引用2025年22号，2025年7月省最低178；65岁到龄次月加2元。取明确政策引文，不从预算总金额反推。','贵州省人力资源和社会保障厅')
],'65岁加2元从到龄次月开始；不加入其他未核市县提高。',{ageExtras:[[65,2]],ageExtraNextMonth:true});
const gansu=limited('甘肃','GANSU_ORDINARY',[300,400,500,600,700,800,900,1000,1500,2000,2500,3000,4000,5000],[30,30,60,60,60,60,60,60,60,60,90,90,120,150],[
 source('gs-resident-provincial-subsidy','甘肃省级14档及省财政补贴明细','https://zwfw.gansu.gov.cn/xiahe/zxgg/art/2025/art_61a34747125242378383429a5ba20d6d.html','普通300至5000共14档。只取明确列出的省财政部分：300/400补30、500至2000补60、2500/3000补90、4000补120、5000补150；县财政另有部分，不把夏河县部分借给全省。','甘肃政务服务网夏河县人社局'),
 source('gs-resident-tiers-2026','甘肃2026居民养老普通14档说明','https://www.huining.gov.cn/xxgk/bmxxgk/rlzyhshbzj/fdzdgknr/sbxx/art/2026/art_51ed03d91c0946469d213f33555e42f5.html','2026政策指南再次列普通300/400/500/600/700/800/900/1000/1500/2000/2500/3000/4000/5000共14档，按年自主选档。','会宁县人民政府2026政策指南')
],'这里只计已核省财政缴费补贴部分，未计市县配套；完整地方基础额待核。');
const profiles={'350000':fujian,'130000':hebei,'210000':liaoning,'410000':henan,'500000':chongqing,'340000':anhui,'360000':jiangxi,'430000':hunan,'530000':yunnan,'520000':guizhou,'620000':gansu};
module.exports=profiles;
