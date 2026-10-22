// Bounded follow-up: ordinary employee references, not current award determinations.
module.exports=function(profile,source){
 const cqRange=source('cq-employee-range-2025','重庆2025社会保险缴费基数政策解读','https://rlsbj.cq.gov.cn/zwgk_182/zcjd/shbz/202509/t20250919_15024652.html','渝人社发〔2025〕20号及人社解读：2025年缴费范围4404—22017元，采用的年平均工资88065元。未来指数按月缴费工资×12÷88065计算；上下限公布取整不改变年工资分母。','重庆市人力资源和社会保障局');
 const cqBase=source('cq-employee-base-2024','重庆2024养老待遇计发基数通知（全文转载）','https://zc.51shebao.com/detail/835031','人社、财政2024年12月26日通知全文：计算2024年新退休人员养老待遇使用8160元/月。采用此已取得的历史通知参考；未将网传2025年8240元或工伤工资直接替换进养老参数，转载不是政府原站原件。','重庆市人社局、财政局（51社保转载）');
 const cqIndex=source('cq-employee-index-cap','重庆人社对1998年后平均缴费指数的公开说明','https://www.cqyz.gov.cn/ztzl_229/xzfywsgk/202606/t20260625_15777328.html','渝中政府2026年6月公开复议材料收录人社答复：原渝劳社发〔2006〕41号已于2024年废止；按2022年起全国统筹口径，1998年1月及以后的平均缴费指数仍不能超过3。本工具仅支持1998年7月后普通实际缴费，历史指数超过3要求核对，不静默改写；未来年度指数上限为3。网页直访搜索工具超时，已通过普通HTTP读取正文。','重庆市渝中区人民政府（人社答复公开材料）');
 const hbRange=source('hubei-employee-range-2025','湖北2025社会保险缴费基数三档标准','https://rst.hubei.gov.cn/zfxxgk/zc/qtzdgkwj/202509/t20250919_5775307.shtml','鄂人社发〔2025〕28号：武汉基准7496、范围4498—22488元；荆门属于第二档，基准7226、范围4299—21678元。第二档下限按公布的4299元，不重新按60%计算成4335.6元。缴费分档不是待遇基数分档。','湖北省人社厅、医保局、税务局');
 const whBase=source('wuhan-employee-case-2024','武汉政府公开的普通职工养老金计算案例','https://sfj.wuhan.gov.cn/qmyfzs/xzfy/xzfyjdgk/2024/202505/P020250523369690549688.pdf','武政复决〔2024〕第990号公开案例：2002年7月起参保，无视同年限，2024年退休，计算表采用基数8880元。仅用作本工具武汉历史案例参考；不宣称8880是2024最终年度标准，更不推广湖北全省。搜索工具已读取PDF案例正文，直接获取因文件约44MB受限。','武汉市人民政府（武汉市司法局公开）');
 const jmBase=source('jingmen-employee-base-2024','荆门发布：企业职工养老待遇计发基数上调','https://www.cnhubei.com/cmdetail/1924625','荆门发布2025年5月23日原报道，来源九派通融媒体中心及人社部门：荆门2024年计发基数6957元/月；2025年5月启用并对2024年1月至2025年4月新增退休人员重算。不是2025年最终标准。报道示例30年、指数0.8的基础养老金为6957×1.8÷2×30×1%=1878.39元。搜索工具有重定向循环，已通过普通HTTP读取完整报道。','荆门发布／荆门九派通融媒体中心（人社政策报道）');
 const historical=(name,baseText,note)=>({year:2024,contributionYear:2025,referenceLabel:name+' · '+baseText+'／2025年缴费参考',referenceText:note+'缴费范围和未来指数工资沿用2025年。均非2026年现行申报标准；只算基础及个人账户两项，未计未来调整、特殊历史权益、地方加发及跨省领取资格。',resultNote:note+'缴费沿用2025年参数，未计未来调整及特殊待遇。'});
 return {profiles:{
  '500000':profile('重庆',4404,22017,8160,88065/12,[cqRange,cqBase,cqIndex],{...historical('重庆','2024年待遇','待遇沿用2024年8160元。'),sourceStatus:'PUBLIC_NOTICE_REPRINT',indexWageMethod:'ANNUAL_WAGE_TWELFTH',historicalIndexMax:3,futureIndexMax:3})
 },cityProfiles:{
  '420100':profile('武汉',4498,22488,8880,7496,[hbRange,whBase],{...historical('武汉','2024年公开案例','待遇参考2024年公开案例的8880元，非该年最终标准。'),sourceStatus:'GOVERNMENT_CASE_REFERENCE'}),
  '420800':profile('荆门',4299,21678,6957,7226,[hbRange,jmBase],{...historical('荆门','2024年待遇','待遇沿用2024年6957元。'),sourceStatus:'GOVERNMENT_MEDIA_REPORT'})
 }};
};
