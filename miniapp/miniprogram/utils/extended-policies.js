// City overrides and explicit provincial references. Never borrow a neighbouring city's amounts.
const source=(id,name,url,text)=>({id,name,url,text});
const nationalResident=source('national-resident-2014','国务院城乡居民养老保险制度意见','https://fgk.chinatax.gov.cn/zcfgk/c102440/c5194451/content.html','国发〔2014〕8号：普通领取条件60岁、累计15年。历史补缴与制度实施时的年龄有关，不能仅凭现在的年龄认定。最低档补贴至少30元，500元及以上档至少60元。');
const zjRange=source('zj-range-2026','浙江2026年社会保险基数通知','https://rlsbt.zj.gov.cn/col/col1229506773/art/2026/art_2b4555c11a034b9e874038cbff2f84fb.html','浙人社发〔2026〕52号：2025年加权平均工资102446元；2026年缴费上下限及待遇据此调整。');
const zjExplain=source('zj-range-explain-2026','浙江2026年基数政策解读','https://rlsbt.zj.gov.cn/col/col1229101513/art/2026/art_e8b496ab59834390884b8d375cff1651.html','官方解读明确月平均工资8537元，2026年缴费范围5122—25611元；单位个人8%、灵活就业20%。');
const zjEmployeeRule=source('zj-employee-rule','浙江企业职工基本养老保险办法','https://zhejiang.chinatax.gov.cn/art/2006/8/28/art_8411_13064.html','浙政发〔2006〕48号：普通新人基础养老金与个人账户养老金分别计算。本参考只算这两项，地方补贴、过渡性调节金另行核定。');
const zjResidentSources=[nationalResident,
 source('zj-resident-tiers','浙江统一居民养老缴费档次','https://www.nanhu.gov.cn/art/2024/1/22/art_1229282596_2510738.html','2024年起全省八档200、300、500、1000、2000、3000、5000、7000元；200元仅困难群体代缴，不作为普通自缴选项。'),
 source('zj-resident-subsidy-2026','浙江2026年中高档补贴要求（杭州官方解读）','https://zfgb.hangzhou.gov.cn/15/104220263/t101220263044/530347.shtml','浙人社发〔2025〕65号要求2000元档补贴至少500元，3000元及以上至少600元。只引用省级下限，不把杭州市区额外标准套给各县市。'),
 source('zj-resident-floor-2025','浙江2025年统计公报','https://zjzd.stats.gov.cn/zwgk/zfxxgkml/tjxx/tjgb/art/2026/art_48c3c7315981425f9c25b53eab4d65d0.html','2025年城乡居民养老保险基础养老金省级最低标准240元/月。本页不含市县提高、缴费年限和高龄加发。')];
const snRange=source('sn-range-2026','陕西2026年职工养老缴费参数','https://rst.shaanxi.gov.cn/sy/tzgg/202608/t20260831_3672572.html','陕人社函〔2026〕326号：2025年全口径工资7895元/月，2026年缴费范围4737—23685元/月。缴费工资不是养老金计发基数。');
const snBaseReference=source('sn-base-disclosure','陕西2025年计发参数公开披露参考','https://static.cninfo.com.cn/finalpage/2026-08-01/1225450633.PDF','上市公司原始披露文件引述省人社厅2025年计发基数7881元。尚未核到省厅该年度通知原件，只作参考参数，不标为已核验官方年度标准。');
const snResidentSources=[nationalResident,
 source('sn-resident-tiers-2025','陕西调整居民养老个人缴费档次','https://rs.tongchuan.gov.cn/73/17042.jhtml','陕人社发〔2025〕17号：2025年6月起普通十档300、500、800、1000、1500、2000、3000、4000、5000、6000元；对应补贴45、75、90、100、150、200、300、300、300、300元。'),
 source('sn-resident-floor-2025','陕西2025年度老龄事业发展报告','https://www.cncaprc.gov.cn/xwllxw/772297.jhtml','2025年省级居民基础养老金最低标准198元/月；省级参考不含西安市及区县加发。')];
const scRange=source('sc-range-2026','四川2026年度社保缴费范围','https://chinajob.mohrss.gov.cn/h5/c/2026-09-11/602828.shtml','2026年三项社会保险缴费范围4699—23493元/月，相关平均工资7831元/月；不能把该工资直接当养老金计发基数。');
const scBase=source('sc-base-2024-case','四川2024年养老金核定实例（行政复议决定）','https://www.hys.gov.cn/hysrmzfw/zffz/pc/content/content_2004109007214288896.html','华蓥市政府行政复议决定核实2024年11月退休案例使用计发基数8321元。本工具仅沿用此历史参数作参考，不称为2025或2026标准。');
const scRule=source('sc-employee-rule','四川完善企业职工养老制度实施办法','https://rst.sc.gov.cn/rst/ylbxjwjzcwj/2022/5/27/753a7c3848e7460f8350ff30e2eefd46/files/川劳社发[2006]17号.pdf','川劳社发〔2006〕17号：普通基础养老金按计发工资、平均缴费指数及实际缴费年限计算；不含独生子女增发等特殊权益。');
const scResidentFloor=source('sc-resident-floor-2026','四川2026年居民基础养老金最低标准','https://cncaprc.gov.cn/xwllxw/773250.jhtml','川人社规〔2026〕5号：2026年7月起省级最低标准223元/月。成都本地比例缴费与待遇公式须另算，不套省内通用档。');
const cdSources=[scResidentFloor,
 source('cd-resident-2026','成都社保2026年缴费金额与条件','https://news.chengdu.cn/2026/0108/695f01f057187e21f2194850.shtml?phone=yes','原始信息署名成都社保，附缴费表：16—59岁个人10%、政府2%；60岁起趸缴个人12%、无缴费补贴。农村五档10%—50%，城镇仅40%、50%。已核对表格原图。'),
 source('cd-resident-rule','成都城乡居民养老保险试行办法','https://www.cdzgh.com/index.php?a=show&c=index&catid=24&id=1870&m=content','成府发〔2009〕58号：按基数8%建立账户，基础养老金按本人指数化月平均缴费工资×年限×1%另算。原站现不可访问，原文交叉核对见法规全文；省级补贴入账部分未核齐，不计作已知增额。'),
 source('cd-resident-rule-text','成都居民养老试行办法全文存档','https://law1.110.com/law_366015.html','成府发〔2009〕58号全文及附件的公开存档，用于原站失效时核对，不是政府现行办理答复。'),
 source('cd-resident-rate-2012','成都调整城镇居民缴费比例通知全文','https://law.esnai.cn/do.aspx?action=show&controller=home&lawid=126773','成府函〔2012〕31号：2012年起60岁前城镇个人费率从12%调整为10%。历史金额估算仅支持2012年起的普通年缴，不能混入以前的趸缴或转入。')];
const profiles={
 '330100':{
  employee:{status:'READY',rule:'ZHEJIANG',min:5122,max:25611,effectiveFrom:'2026-01',pensionBase:8537,year:2026,indexWage:8537,referenceLabel:'浙江省级基本两项参考',referenceText:'缴费用2026年5122—25611元、待遇工资8537元。只算基础与个人账户两项，未计浙江地方补贴、过渡性调节金及未来调整；不是完整核定待遇。',sources:[zjRange,zjExplain,zjEmployeeRule]},
  resident:{status:'READY',rule:'ZHEJIANG_ORDINARY',provincial:true,base:240,baseYear:2025,tiers:[300,500,1000,2000,3000,5000,7000],subsidies:[30,60,60,500,600,600,600],referenceLabel:'浙江省级参考 · 非市县完整待遇',referenceText:'基础养老金按2025年省级最低240元，补贴按已核实最低要求；未计市县提高、年限及高龄加发。杭州各区县均先用此参考，普通逐年交满15年，不默认补缴。',sources:zjResidentSources}},
 '610100':{
  employee:{status:'READY',rule:'SHAANXI',min:4737,max:23685,effectiveFrom:'2026-01',pensionBase:7881,year:2025,indexWage:7895,parameterStatus:'REFERENCE',referenceLabel:'陕西省级参考 · 计发通知原件待补',referenceText:'缴费采用省厅2026年4737—23685元标准；待遇暂用公开披露引述的2025年7881元参考参数，省厅年度计发通知原件待补。未来指数暂按省级工资7895元不变；不含特殊历史权益。',sources:[snRange,snBaseReference,nationalEmployeeRule()]},
  resident:{status:'READY',rule:'SHAANXI_ORDINARY',provincial:true,base:198,baseYear:2025,tiers:[300,500,800,1000,1500,2000,3000,4000,5000,6000],subsidies:[45,75,90,100,150,200,300,300,300,300],referenceLabel:'陕西省级参考 · 非市县完整待遇',referenceText:'按2025年省级最低198元及普通十档计算，未计西安市、区县、年限和高龄加发。只安排以后逐年交满15年，历史补缴另核，不默认60岁一次补足。',sources:snResidentSources}},
 '510100':{
  employee:{status:'READY',rule:'SICHUAN',min:4699,max:23493,effectiveFrom:'2026-01',pensionBase:8321,year:2024,indexWage:7831,parameterStatus:'REFERENCE',referenceLabel:'四川省级参考 · 2024年待遇参数',referenceText:'缴费用2026年4699—23493元，待遇沿用已核实的2024年8321元历史参数，未冒充当年标准。未来指数暂按省级工资7831元不变，不含独生子女增发等特殊待遇。',sources:[scRange,scBase,scRule]},
  resident:{status:'READY',rule:'CHENGDU_REFERENCE',effectiveFrom:'2026-07',base:223,baseYear:2026,tiers:[1138.32,2276.64,3414.96,4553.28,5691.60],subsidies:[227.64,455.28,683.04,910.68,1138.32],lumpTotals:[20489.4,40978.8,61470,81959.4,102448.8],residenceRequired:true,lumpAt60:true,referenceLabel:'成都缴费方案 · 待遇参考',referenceText:'年缴和到60岁趸缴按成都2026年表；待遇按本人缴费推算基数、8%账户及四川2026最低补贴223元计算。历史指数未逐年还原，省级缴费补贴的个人账户增额未知未计，实际可能更高。',sources:cdSources}}
};
function nationalEmployeeRule(){return source('national-employee-2005','国务院完善企业职工养老保险制度决定','https://www.gov.cn/zwgk/2005-12/14/content_127311.htm','国发〔2005〕38号：基础养老金为计发工资和本人指数化工资平均值×年限×1%；账户按8%记入。这里只算普通基本两项，不含地方特殊权益。');}

const provinceReferences={'330000':profiles['330100'],'610000':profiles['610100'],'510000':{employee:profiles['510100'].employee}};
const cityOverrides={'510100':{resident:profiles['510100'].resident}};
module.exports={provinceReferences,cityOverrides};
