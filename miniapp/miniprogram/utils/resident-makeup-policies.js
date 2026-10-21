// Province-wide eligibility routes. A route never substitutes for a person's approval.
const source=(id,name,url,text,publisher)=>({id,name,url,text,publisher,checkedAt:'2026-10-21'});
const scTiers=[200,300,400,500,600,700,800,900,1000,1500,2000,3000,4000,5000,6000];
const policies={
 '14':{name:'山西',modes:['lump'],sources:[source('sx-makeup-2025','山西60岁不足15年补足答复','https://shanxi.chinatax.gov.cn/hdjl/zxftmx/yq-11403-531-29518','2025年8月税务答复：到60缴不足15年可逐年继续，也可一次补至15年，补缴无补贴。单价和个人能补年数须核定；不包含另行参加的补充养老。','国家税务总局阳泉市税务局')],note:'到60岁不足15年，可申请一次补足；这里按你向社保核对的单价计算，不含补充养老。'},
 '37':{name:'山东',modes:['lump'],sources:[source('sd-makeup-2022','山东省居民养老到龄补足规定','https://hrss.jining.gov.cn/art/2022/11/18/art_15085_2712688.html','鲁人社发2022年22号第一（四）项：达到待遇领取年龄不足规定年限，办理待遇手续当年允许一次补缴，累计不超15年；补缴无补贴且不计年限基础养老金。','济宁市人社局公开山东省四部门原文')],note:'到龄办理领取的当年，可按核定金额补足15年，无补贴；不开放历史已交档次任意提高。'},
 '51':{name:'四川',modes:['missing','upgrade','lump'],effectiveFrom:'2024-12',validThrough:'2026-11',upgradeMinAge:60,min:200,max:6000,sources:[source('sc-makeup-2024','四川城乡居民养老补缴政策及有效期','https://www.luojiang.gov.cn/gk/cdgk/fdzdgknr/jtfdxx/jyca/grddbjyhdb/1567739.htm?slb=1','区人社正式答复明确引用川人社规2024年12号：60岁可补至15年，参保期间断缴可补，60岁可对正常已缴年度升档。现行省15档200至6000，补缴无补贴；2024年12月1日起有效2年。成都独立制度不套本适配。','德阳市罗江区人社局（明确引用省三部门通知）')],note:'规定到2026年11月底有效。补断缴、60岁补足和60岁提高正常已交年度档次分开；已领待遇不能再补。'},
 '22':{name:'吉林',modes:['missing'],lastMissingYear:2024,sources:[source('jl-makeup-2025','吉林旧年度补缴必须用原缴费标准','https://xxgk.jl.gov.cn/PDFfile/202512/9386566.pdf','吉人社联2025年135号解读：补2024及以前未缴年度按原缴费标准。本入口只计算这部分核定欠费，不将2025单列重新选档规定扩成所有历史提档。旧年补贴未在该材料核实，参考暂0。','吉林省人力资源和社会保障厅')],note:'补2024年及以前的漏缴，用社保确认的旧年单价；不能拿现在的新档直接套过去。'},
 '21':{name:'辽宁',modes:['missing'],sources:[source('ln-makeup-2026','辽宁中断年度补缴不享受缴费补贴','https://www.ln.gov.cn/web/zwgkx/lnsrmzfgb/2025n/qk/2025n_dessq/bmwj/2025112009203925536/index.shtml','省2026缴费通知明确中断年度补缴无缴费补贴。具体可补年度及原年度单价需核定，不把2026新增高档倒套全部过去年份。','辽宁省人民政府公报')],note:'补实际中断的年度，没有缴费补贴；先核对哪些年能补以及这些年度的单价。'},
 '41':{name:'河南',modes:['missing'],sources:[source('hn-makeup-2019','河南居民养老中断缴费补缴规则','https://shbx.hrss.henan.gov.cn/hnsi/zhengce/fagui/webinfo/1572070561756560.htm','豫人社2019年3号明确中断年度补缴无补贴。这里只按已核可补年度和费用计算，不由累计缺几年直接生成可补几年。','河南省社会保险中心')],note:'补以前实际漏缴的年份，不加旧年补贴；个人可补起点和金额仍需社保核对。'}
};
policies['51'].tiers=scTiers;
const urumqi={name:'乌鲁木齐',modes:['missing','upgrade'],distanceMonths:180,max:5500,sources:[source('urumqi-makeup-2024','乌鲁木齐漏缴及已缴年度提高档次说明','https://www.xinjiang.gov.cn/xinjiang/dzdt/202401/91fe35d332e44a97a0bdce058d1595ed.shtml','市人社说明允许补未缴年度或提高已缴年度，距领取年龄不足15年可补，正常与补缴合计不超15年。只在乌鲁木齐使用，不扩到自治区其他地区或兵团。','新疆维吾尔自治区政府公开乌鲁木齐人社说明')],note:'先核对可补年度、原金额和目标金额。正常与补缴累计不超15年；本页旧年补贴暂不计。',capYears:15};
function get(regionId,rule){if(String(regionId)==='510100'||rule==='CHENGDU_REFERENCE')return null;return String(regionId)==='650100'?urumqi:policies[String(regionId).slice(0,2)]||null;}
module.exports={get,policies};
