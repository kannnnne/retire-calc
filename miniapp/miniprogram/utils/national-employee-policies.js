// Provincial ordinary employee references. Historical parameters are frozen,
// not asserted to be current-year contribution standards or complete awards.
const source=(id,name,url,text,publisher)=>({id,name,url,text,publisher,checkedAt:'2026-10-22'});
const national=source('national-employee-2005','国务院完善企业职工养老保险制度决定','https://www.gov.cn/zwgk/2005-12/14/content_127311.htm','国发〔2005〕38号：普通实际缴费人员计算基础养老金、个人账户养老金；个人账户按缴费工资8%记入。特殊历史权益和地方附加待遇不在本工具内。','国务院');
const tjRange=source('tj-employee-range-2025','天津税务：2025年缴费上下限','https://tianjin.chinatax.gov.cn/nsrxt/11200000000/0500/050007/20260122141605857.shtml','2025年10月起月缴费范围5124—25620元。本工具沿用此历史范围作参考，未来指数工资按上限÷3推算8540元，不把9417元计发基数充当指数工资。','国家税务总局天津市税务局');
const tjBase=source('tj-employee-base-2025','天津2025年度基本养老金计发基数','https://www.tj.gov.cn/zwgk/zfxxgkzl/fdzdgknr/zdmsxx220316/yl_157354/zcwj_157367/202609/t20260914_7373588.html','津人社局发〔2025〕9号：2025年度计发基数9417元。文件提到的延缴5年后趸缴有参保时间等条件，本页不据此自动生成一次补足。','天津市人力资源和社会保障局、财政局');
const hb=source('hb-employee-2025','河北2025缴费及计发通知全文（京报网转载）','https://news.bjd.com.cn/2025/09/20/11316161.shtml','冀人社字〔2025〕105号全文，京报网注明来源河北省人民政府：缴费工资6678元，范围4007—20034元，计发基数7410元。当前采用政府通知的媒体全文转载，未标为本次已取得省厅原站原件。','河北省人力资源和社会保障厅、财政厅（京报网转载）');
const ln=source('ln-employee-2025','辽宁2025养老保险缴费和计发基数','https://liaoning.chinatax.gov.cn/art/2025/9/15/art_5869_7692.html','辽人社〔2025〕17号：缴费4359—21792元，100%档7264元；计发基数普通地区7346元、沈阳8390元、大连8956元，分别适配，不混用。','辽宁省人社厅、财政厅，辽宁省及大连市税务局');
const jl=source('jl-employee-2025','吉林2025养老缴费及计发基数','https://xxgk.jl.gov.cn/PDFfile/202509/9324837.pdf','吉人社联〔2025〕97号：2025年7月至2026年6月普通职工缴费4393.2—21966元，工资7322元；2025计发基数普通地区87865元/年、长春95739元/年，换算为月使用。农垦企业另有标准，本页不适用。','吉林省人社厅、财政厅、医保局、税务局');
const fj=source('fj-employee-2025','福建2025企业养老缴费及计发基数','https://rst.fj.gov.cn/zw/zfxxgk/zfxxgkml/zyywgz/ldgx/202509/t20250922_7013397.htm?iszzb=1','闽人社文〔2025〕45号：企业职工缴费4043—22607元，计发7932元；不误用机关事业下限4521元。未来指数工资以已核300%缴费上限÷3近似，历史平均指数仍按用户填写值。','福建省人社厅、财政厅、税务局');
const hn=source('hn-employee-2025','湖南2025缴费及计发标准解读','https://rst.hunan.gov.cn/rst/xxgk/zcfg/zcjd/202509/t20250922_33809946.html','湘人社规〔2025〕30号解读：2025年缴费4072—20361元，基准6787元，基本养老金计发基数7694元。此处沿用历史参数，不作为2026年实际申报依据。','湖南省人力资源和社会保障厅');
const yn=source('yn-employee-2025','云南2025职工养老相关参数','https://hrss.yn.gov.cn/NewsView.aspx?cid=552&isZt=7&nid=63062&pid=971','2025年缴费工资7263元，范围4357—21789元；新增退休人员计发基数8265元，当期实际缴费指数使用7263元，不能混成同一个基数。','云南省人社厅、财政厅、税务局');
const nx=source('nx-employee-2025','宁夏2025社保缴费和待遇计发基数','https://hrss.nx.gov.cn/xxgk/zcj/zcfg/shbz/202509/t20250921_5030586.html','宁人社发〔2025〕130号：缴费基准8258元、范围4955—24774元；城镇职工基本养老金计发基数8366元。已读取官网搜索正文，原站直接访问405，不用福利待遇10398元替代养老计发基数。','宁夏回族自治区人社厅、财政厅、医保局、税务局');
function profile(name,min,max,pensionBase,indexWage,sources,extra={}){
 return {status:'READY',rule:'NATIONAL_ORDINARY_REFERENCE',parameterStatus:'REFERENCE',employeeOnly:true,min,max,pensionBase,indexWage,year:2025,contributionYear:2025,effectiveFrom:'2025-01',referenceLabel:name+' · 2025年参数参考',referenceText:'缴费及待遇沿用已录入的2025年参数，不代表2026年现行申报标准。仅算企业职工基础养老金和个人账户养老金；未来工资、利息和待遇调整未计入，特殊历史权益、地方加发及跨省领取资格另核。',sources:[...sources,national],resultNote:'沿用2025年参数，未计未来调整及特殊待遇。',...extra};
}
const profiles={
 '120000':profile('天津',5124,25620,9417,8540,[tjRange,tjBase],{effectiveFrom:'2025-10',indexWageMethod:'UPPER_LIMIT_THIRD'}),
 '130000':profile('河北',4007,20034,7410,6678,[hb],{sourceStatus:'GOVERNMENT_TEXT_REPRINT'}),
 '210000':profile('辽宁',4359,21792,7346,7264,[ln]),
 '220000':profile('吉林',4393.2,21966,87865/12,7322,[jl],{effectiveFrom:'2025-07',contributionEnd:'2026-06',referenceText:'普通企业职工参考，排除农垦企业。缴费范围沿用2025年7月至2026年6月历史标准，2025年计发基数按年额÷12换为月额；不代表2026年现行缴费标准。只算基础与个人账户两项，未来调整和特殊权益未计。'}),
 '350000':profile('福建',4043,22607,7932,22607/3,[fj],{indexWageMethod:'UPPER_LIMIT_THIRD'}),
 '430000':profile('湖南',4072,20361,7694,6787,[hn]),
 '530000':profile('云南',4357,21789,8265,7263,[yn]),
 '640000':profile('宁夏',4955,24774,8366,8258,[nx])
};
const overrides={
 '210100':{pensionBase:8390,referenceLabel:'沈阳 · 2025年参数参考'},
 '210200':{pensionBase:8956,referenceLabel:'大连 · 2025年参数参考'},
 '220100':{pensionBase:95739/12,referenceLabel:'长春 · 2025年参数参考'}
};
// This round stops here: missing key inputs are not substituted with neighbours.
const skipped={
 '140000':'缴费上下限已找到，计发基数未取得可靠原文',
 '150000':'缴费上下限已找到，普通职工计发基数未核齐',
 '230000':'缴费、指数工资与计发基数未成套核齐',
 '320000':'缴费范围与基本公式已有来源，年度计发基数未核齐',
 '340000':'缴费范围已有来源，年度计发基数未核齐',
 '360000':'年度缴费与计发参数未取得成套可靠原文',
 '370000':'缴费范围已找到，计发原文和菏泽差异未核齐',
 '410000':'缴费范围线索已有，省市计发口径未核齐',
 '420000':'省内分档及各市待遇差异尚未核齐，不能全省套武汉',
 '460000':'缴费线索已有，计发基数与指数口径未核齐',
 '500000':'缴费范围已有线索，计发参数与指数限制未核齐',
 '520000':'缴费及计发参数未取得成套可靠原文',
 '540000':'年度参数与地方待遇差异未核齐',
 '620000':'缴费通知已有线索，年度计发基数未核齐',
 '630000':'缴费通知已有线索，年度计发基数未核齐',
 '650000':'已取得2026缴费范围，计发工资及兵团独立口径未核齐'
};
module.exports={profiles,overrides,skipped};
