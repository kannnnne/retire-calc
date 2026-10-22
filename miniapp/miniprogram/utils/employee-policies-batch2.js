// Historical ordinary-employee references, independently sourced from payment ranges.
// Reprints/copies and derived figures are identified rather than presented as originals.
module.exports=function(profile,source){
 const sxRange=source('sx-employee-range-2025','山西2025社会保险缴费基数','https://rsj.changzhi.gov.cn/zwxx/rsjtzgg/202510/t20251024_3102248.html','晋人社厅发〔2025〕35号，长治人社转载：2025年基准6997元/月、下限4198元、上限20991元。','山西省人社厅等部门（长治市人社局转载）');
 const sxBase=source('sx-employee-base-2025','山西2025养老金计发基数通知（全文转载）','https://zc.51shebao.com/detail/839909','晋人社厅发〔2025〕36号全文：2025年月计发基数7253元。此次取得的是通知全文转载，未取得省厅原站原件，不将转载站的发布日期作为通知生效日期。','山西省人社厅、财政厅（51社保转载）');
 const nmRange=source('nm-employee-range-2025','内蒙古2025缴费基数与实际缴费指数','https://neimenggu.chinatax.gov.cn/xxgk/tzgg/202510/t20251011_841386.html','2025年9月11日通知：全口径月工资8179元，缴费4907—24537元，2025实际缴费指数使用8179元。','内蒙古自治区人社厅、财政厅、税务局');
 const nmBase=source('nm-employee-base-2025','包头青山区人社：退休养老金计算实例','https://www.qsq.gov.cn/bmdt/103789.html','2025年11月20日青山区人社示例：基础养老金以8179元为基数、平均指数0.6、缴费189个月计算为1030.55元。此值取自政府公开实例；读取官网搜索正文，原站直接访问超时。','包头市青山区人力资源和社会保障局');
 const hlj=source('hlj-employee-2025','黑龙江2025企业职工养老缴费档次通知','https://songling.gov.cn/songling/c100317/202501/c13_302609.shtml','依据黑人社函〔2024〕548号，2025年计算缴费与基本养老金使用的全口径年工资90840元，即月7570元；普通职工60%—300%范围换算为4542—22710元。','松岭区政府公开，大兴安岭社保通知');
 const jsRange=source('js-employee-range-2025','江苏2025社会保险有关基数','https://jsychrss.yancheng.gov.cn/art/2025/9/19/art_23871_4370166.html','苏人社发〔2025〕33号：2025年1—12月企业职工养老缴费4952—24762元。未来指数工资按300%上限÷3取8254元，不用养老金计发基数代替。','江苏省人社厅等四部门（盐城市人社局转载）');
 const jsBase=source('js-employee-base-2025','金湖政府2025年度社会保障公开记录','https://www.jinhu.gov.cn/col/1387_142711/o/index.html','政府2026年4月16日发布的2025年度记录：2025年1月1日至12月31日达到领取年龄者基础养老金计发基数8917元。已读官网搜索正文，直访超时；不当作2026年计发基数。','金湖县人民政府');
 const ahRange=source('ah-employee-range-2025','安徽2025社会保险缴费基数上下限','https://www.ahjd.gov.cn/Jczwgk/show/3644676.html','2025年9月19日通知：2025年1—12月缴费4311—21556元。未来指数工资按300%上限÷3近似，保留小数，不把取整后的下限倒推成另一个工资。','安徽省人社厅等五部门（旌德县政府转载）');
 const ahBase=source('ah-employee-base-2025','安徽2025退休人员基本养老金计发基数','https://www.ahlx.gov.cn/OpennessContent/show/3644517.html','皖人社秘〔2025〕153号：2025年退休人员基本养老金计发基数7999元/月。','安徽省人社厅、财政厅（郎溪县政府转载）');
 const jxRange=source('jx-employee-range-2025','江西2025缴费与指数通知（全文转载）','https://hrlib.ciic-cloud.cn/news/info?id=01k5re8pae9pkg0d6s72ejwxma','2025年城镇职工养老缴费基准6525元，范围3915—19575元；当年实际缴费指数按缴费基数÷6525计算。原省厅通知链接直访未成功，使用中智收录的通知全文。','江西省人社厅、财政厅、税务局（中智转载）');
 const jxBase=source('jx-employee-base-2025','江西2025基本养老金计发基数','https://www.jxln.gov.cn/lnxxxgk/zcwjscbhg/202512/8aa82bef0c2c4fcca30840e9549bc177.shtml','2025年9月21日省人社、财政通知：2025年基本养老金计发基数7054元/月。','江西省人社厅、财政厅（龙南市政府转载）');
 const sdRange=source('sd-employee-range-2025','山东2025社会保险缴费基数','https://dsjj.taian.gov.cn/art/2025/9/24/art_351704_5383.html','鲁人社字〔2025〕91号：2025年缴费工资7506元，范围4504—22518元；实际缴费指数使用7506元。','山东省人社厅等部门（泰安市政府转载）');
 const sdBase=source('sd-employee-base-2025','山东2025职工养老计发基数（通知PDF副本）','https://file.m12333.cn/upfile/download/65b59c91-3653-8b41-ba87-6c0647f126b3.pdf','鲁人社字〔2025〕100号，2025年10月16日原通知PDF副本：除菏泽市以外的企业养老保险月计发基数7831元。副本来自第三方文件站，不冒充政府域名原件；不把7831元套给菏泽。','山东省人力资源和社会保障厅（公开通知PDF副本）');
 const gzRange=source('gz-employee-wage-2025','贵州2025社会保险采用的全口径工资','https://renshi.gznc.edu.cn/info/1236/3872.htm','黔人社发〔2025〕16号，2025年9月17日通知：2024年全口径年工资87894元，用于2025年缴费上下限和基本养老金计发；除12得7324.5元/月。','贵州省人社厅等四部门（贵州师范学院转载）');
 const gzRule=source('gz-employee-unified-2019','贵州统一企业职工养老计算口径','https://www.gzszx.gov.cn/gzzxb/web/doc/detail/d_1299441426369760','贵州政协报2019年6月21日解读省级统筹通知：全口径工资统一作为缴费上下限、计发养老金专用指标；实际缴费指数也使用上年度全口径工资，普通个人缴费8%。结合2025年工资通知推得计发7324.5元、60%—300%范围4394.7—21973.5元。','贵州政协报');
 const gsRange=source('gs-employee-range-2025','甘肃2025职工基本养老缴费基数','https://zwfw.gansu.gov.cn/jingtai/zczx/tzgg/art/2025/art_d1843db9488b4c05a72172f576397f9f.html','2025年缴费基准7338元/月，上限22014元、下限4403元。仅此范围属于2025年，不能据此推导待遇计发基数。','甘肃省人社厅（甘肃政务服务网转载）');
 const gsBase=source('gs-employee-base-2024','甘肃2024年养老金计发基数公开确认','https://www.jyg.gov.cn/rsj/xwdt/bmdt/art/2025/art_2de3800b28314efb932da6c79eda737d.html','嘉峪关人社2025年1月16日公开确认：甘人社通〔2024〕330号规定2024年月计发基数7594元。2025年计发额原文未核实，本工具明确沿用2024年待遇参数参考，不标成2025或2026标准。','嘉峪关市人力资源和社会保障局');
 const qh=source('qh-employee-2025','青海2025缴费及养老金计发基数','https://m.thepaper.cn/baijiahao_31664625','四部门2025年9月19日通知，夏都西宁政务号全文发布：缴费基准8816元/月，基本养老金计发9056元/月。普通职工60%—300%范围换算为5289.6—26448元。','青海省人社厅等四部门（夏都西宁政务号发布）');
 return {profiles:{
  '140000':profile('山西',4198,20991,7253,6997,[sxRange,sxBase],{sourceStatus:'PUBLIC_NOTICE_REPRINT'}),
  '150000':profile('内蒙古',4907,24537,8179,8179,[nmRange,nmBase],{sourceStatus:'GOVERNMENT_EXAMPLE'}),
  '230000':profile('黑龙江',4542,22710,7570,7570,[hlj],{rangeMethod:'WAGE_60_300_PERCENT'}),
  '320000':profile('江苏',4952,24762,8917,8254,[jsRange,jsBase],{indexWageMethod:'UPPER_LIMIT_THIRD',sourceStatus:'GOVERNMENT_SEARCH_TEXT'}),
  '340000':profile('安徽',4311,21556,7999,21556/3,[ahRange,ahBase],{indexWageMethod:'UPPER_LIMIT_THIRD'}),
  '360000':profile('江西',3915,19575,7054,6525,[jxRange,jxBase],{sourceStatus:'PUBLIC_NOTICE_REPRINT'}),
  '370000':profile('山东',4504,22518,7831,7506,[sdRange,sdBase],{sourceStatus:'NOTICE_PDF_COPY'}),
  '520000':profile('贵州',4394.7,21973.5,7324.5,7324.5,[gzRange,gzRule],{pensionBaseMethod:'UNIFIED_FULL_SCOPE_WAGE',rangeMethod:'WAGE_60_300_PERCENT'}),
  '620000':profile('甘肃',4403,22014,7594,7338,[gsRange,gsBase],{year:2024,referenceLabel:'甘肃 · 2024年待遇／2025年缴费参考',referenceText:'待遇计发基数沿用已核实的2024年7594元，缴费范围及未来指数工资沿用2025年参数，均非2026年现行申报标准。仅算基础及个人账户养老金；未计未来调整、特殊历史权益及地方加发。',resultNote:'待遇沿用2024年、缴费沿用2025年参数，未计未来调整及特殊待遇。'}),
  '630000':profile('青海',5289.6,26448,9056,8816,[qh],{rangeMethod:'WAGE_60_300_PERCENT',sourceStatus:'GOVERNMENT_ACCOUNT_NOTICE'})
 },overrides:{'371700':{status:'PENDING',reason:'本地区暂未开放：山东计发通知明确不含菏泽，菏泽企业职工计发基数尚未核实，暂不提供金额。',sources:[sdBase]}}};
};
