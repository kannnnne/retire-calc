// Autonomous-region reference only. Corps and Tibet are deliberately separate.
module.exports=function(profile,source){
 const range=source('xinjiang-employee-range-2025','新疆2025城镇职工养老保险缴费基数通知','https://rst.xinjiang.gov.cn/xjrst/zcwj/202509/18cb0640282f47ed96226e02a95a9270.shtml','新人社函〔2025〕168号：2024年全口径工资8448元/月，2025缴费下限5069、上限25344元。通知提及缴费及待遇核定，但未单独公布养老金计发基数；不能单凭缴费上下限认定待遇基数。','新疆维吾尔自治区人社厅、财政厅、税务局');
 const rule=source('xinjiang-employee-formula-2006','新疆调整完善城镇企业职工基本养老金计发办法','https://www.xinjiang.gov.cn/xinjiang/c112543/202311/f1560797b2c7442a8b975c2cadcda6ee.shtml','新政发〔2006〕59号：普通基础养老金按上年自治区工资与本人指数化工资平均值、年限及1%计算，个人账户除国家计发月数。1996年前参加工作的历史过渡权益不纳入本工具。第六项明确兵团可另定实施办法，故不向兵团城市自动外推。退休年龄、最低缴费年限和续缴使用后续国家规定，不沿用2006年旧终止关系条款。','新疆维吾尔自治区人民政府');
 const merge=source('xinjiang-employee-wage-merge-media','财新：部分省份养老金计发工资与社平工资统一','https://m.caixin.com/m/2024-12-31/102273732.html?channelSource=102273732&originReferrer=wap_article','财新2024年12月31日报道新疆等部分省份已统一社平工资与养老金计发基数。本工具结合2025年官方工资8448元作合并口径推算；未取得2025年计发基数单独通知及合并办法原件，不能称8448元已获2025待遇通知独立核实，不代表2026标准。此推算不证明兵团也适用。','财新（周信达报道；口径线索，非官方年度待遇通知）');
 return profile('新疆',5069,25344,8448,8448,[range,rule,merge],{
  effectiveFrom:'2025-09',referenceLabel:'新疆 · 2025年工资合并口径参考',sourceStatus:'MEDIA_MERGE_INFERENCE',pensionBaseMethod:'MEDIA_REPORTED_MERGE_ASSUMPTION',
  referenceText:'仅自治区普通企业职工；兵团不适用。缴费范围采用2025年官方5069—25344元，指数工资8448元。依据媒体披露的工资合并口径，以8448元推算待遇，未取得2025年独立计发通知；这是有条件参考，不是2026核定标准。不计视同、历史过渡、地方附加或未来调整。',
  resultNote:'按2025年参数参考；计发基数按工资合并口径推算，未获年度待遇通知核实。兵团不适用。'
 });
};
