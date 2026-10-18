// Province-wide reference scenarios. A provincial floor is never a city's full benefit.
const source=(id,name,url,text)=>({id,name,url,text});
const gdEmployeeSources=[
 source('gd-2026-range','广东2026年职工养老缴费范围','https://guangdong.chinatax.gov.cn/gdsw/mmsw_gkwj/2026-10/13/content_87b090a21cbb45a3b8adb477f596793a.shtml','粤人社发〔2026〕24号：1月起全省企业下限统一5510元，7月起5521—27603元。'),
 source('gd-2025-base','广东2025年计发基数','https://guangdong.chinatax.gov.cn/gdsw/ssfggds/2025-10/27/content_ba2a20bf040648e089f9edf9f557fa2b.shtml','粤人社发〔2025〕32号：2025年计发基数9493元/月，深圳另行公布。本工具保留该年度作静态参考。'),
 source('gd-basic-rule','广东企业基本养老金计发办法','https://www.dg.gov.cn/zwgk/zfgb/szfwj/content/post_341170.html','粤府〔2006〕96号：基础养老金按指数化工资及缴费年限计算，平均缴费指数低于0.6时使用修正系数。特殊历史权益不在简易计算范围。'),
 source('gd-flex-2026','广东灵活就业参保办法','https://guangdong.chinatax.gov.cn/gdsw/ssfggds/2026-05/06/content_45505ebfc8f54089ae9bd6300fd49138.shtml','灵活就业缴费20%，个人账户按基数8%记入；不把统筹部分当作个人账户。深圳地方补充养老另行处理。')
];
const gdResidentSources=[
 source('gd-resident-rule','广东城乡居民养老保险实施办法','https://czt.gd.gov.cn/sszc/content/post_3161821.html','粤府〔2019〕105号：省级九档180—4800元；低三档补贴至少30元，其余至少60元。普通参保人不足年限可延缴，逐年缴至65岁仍不足才可一次补足，补足不享缴费补贴；各地可提高标准。'),
 source('gd-resident-floor','2025年广东居民基础养老金省级最低标准','https://www.xinxing.gov.cn/xxxrmzf/xxdt/bmdt/content/post_1990541.html','公布2025年全省基础养老金最低标准为240元/月。这里只计算省级参考，不等于每个市县实际标准，也未加入未来上调。'),
 source('gd-resident-example','省级九档与补贴的经办说明','https://www.gdwc.gov.cn/zjwcsbj/gkmlpt/content/2/2154/post_2154595.html','吴川社保说明九档180、240、360、600、900、1200、1800、3600、4800元，低三档补30元、其余补60元；当地2025年7月基础养老金240元。其他城市加发另行核对。')
];
const gxEmployeeSources=[
 source('gx-range-reprint','广西2026缴费通知全文（人社政策转载）','https://www.bhqz.net/wap/c_article-a_show-id_4046.html','署名广西人社厅的桂人社发〔2026〕32号通知全文，2026年9月18日；供原站不可访问时核对4204.8—21024元范围。'),
 source('gx-base-reprint','广西2025计发通知全文（中国会计视野）','https://law.esnai.cn/do.aspx?action=show&controller=home&lawid=227384','上海国家会计学院中国会计视野所载桂人社发〔2025〕43号通知全文；2025待遇计发基数6983元。不是2026标准。'),
 source('gx-2026-range','广西2026年社会保险缴费基数通知','https://rst.gxzf.gov.cn/zwgk/xxgkzcfg/fgfxlm/t28152939.shtml','桂人社发〔2026〕32号：核定指标7008元/月，养老缴费范围4204.8—21024元/月。通知全文另见北海求职网人社政策转载；原站暂可能无法访问。'),
 source('gx-2025-base','广西2025年职工养老计发基数','https://rst.gxzf.gov.cn/zwgk/xxgkzcfg/fgfxlm/t25993557.shtml','桂人社发〔2025〕43号：2025年计发基数6983元/月。原文暂无法访问，核对了上海国家会计学院中国会计视野所载通知全文；不称为2026年计发基数。'),
 source('gx-employee-rule','广西统一企业职工养老政策通知全文','https://law.esnai.cn/do.aspx?action=show&controller=home&lawid=211138','桂人社规〔2019〕26号通知全文：单位职工个人8%、灵活就业20%、个人账户8%；普通基础养老金为计发基数×(1＋平均指数)÷2×缴费年限×1%。平均指数和年限按当地规则取位。')
];
const gxResidentSources=[source('gx-resident-qa','广西社保中心居民养老政策问答','https://www.gxzf.gov.cn/hdzsk/zzqrlzyshbzt/shbz/t27083622.shtml','自治区社保中心2026年1月问答：普通个人年缴200至6000元15档，补贴35至200元；2025年7月最低基础养老金186元，65岁以上191元；超过15年每年加2元。历史补缴资格须结合制度实施时间，不按目前年龄自动认定。原文暂可能无法访问。')];
gxResidentSources.push(source('gx-resident-makeup-2023','广西2023补缴与历史提档原文','https://guangxi.chinatax.gov.cn/zcwj/zxwj/202308/t20230828_391042.html','桂人社规〔2023〕2号，自2023年10月1日起：未领取待遇者可补断缴年度、提高已缴年度档次，但各年不超当年最高档。历史断缴及提档无补贴；提高本年档次补贴只补差额。制度实施时距60岁不足15年、按规定逐年缴至60岁者，补不足年限可按当前档且有补贴；资格不能只按现在年龄认定。本工具已支持明确年度的历史补缴和提档；过渡补足资格仍须核清制度起点与连续记录。'));
gxResidentSources.push(source('gx-resident-historical-tiers','广西补缴通知附件：各历史年度档次表','https://guangxi.chinatax.gov.cn/zcwj/zxwj/202308/W020230828351326245288.doc','2023通知原始附件列明：2010—2013年100至1000元共10档；2014—2018年新增1500、2000元，共12档；2019年起普通200至6000元15档。不能把2019年6000元档倒套到2018年及以前，困难群体保留档不是普通自缴档。附件已下载核对，未随应用打包；具体可补起点还须当地制度建立时间及个人记录。'));
const gdNames=['广州市','韶关市','深圳市','珠海市','汕头市','佛山市','江门市','湛江市','茂名市','肇庆市','惠州市','梅州市','汕尾市','河源市','阳江市','清远市','东莞市','中山市','潮州市','揭阳市','云浮市'];
const gdCodes=['440100','440200','440300','440400','440500','440600','440700','440800','440900','441200','441300','441400','441500','441600','441700','441800','441900','442000','445100','445200','445300'];
const gxNames=['南宁市','柳州市','桂林市','梧州市','北海市','防城港市','钦州市','贵港市','玉林市','百色市','贺州市','河池市','来宾市','崇左市'];
const gxCodes=['450100','450200','450300','450400','450500','450600','450700','450800','450900','451000','451100','451200','451300','451400'];
const gdEmployee={status:'READY',rule:'GUANGDONG',min:5521,max:27603,effectiveFrom:'2026-07',pensionBase:9493,year:2025,indexWage:9493,referenceLabel:'广东省级参数参考',referenceText:'缴费用2026年7月标准；待遇、未来缴费指数暂按2025年计发参考参数9493元不变计算。未计未来调整及特殊历史权益。',sources:gdEmployeeSources};
const gxEmployee={status:'READY',rule:'GUANGXI',min:4204.8,max:21024,effectiveFrom:'2026-01',pensionBase:6983,year:2025,indexWage:6983,referenceLabel:'广西省级参数参考',referenceText:'缴费用2026年度标准；待遇、未来缴费指数暂按2025年计发参考参数6983元不变计算。未计未来调整及特殊历史权益。',sources:gxEmployeeSources};
const gdResident={status:'READY',rule:'GUANGDONG_ORDINARY',base:240,baseYear:2025,tiers:[180,240,360,600,900,1200,1800,3600,4800],subsidies:[30,30,30,60,60,60,60,60,60],extraYear:3,lumpAt65:true,provincial:true,referenceLabel:'省级参考 · 非市县完整待遇',referenceText:'按2025年省级最低基础养老金240元和省级参考档计算，未计市县加发。当地实际缴费档、补贴和补缴档次可能不同，办理前需确认。',sources:gdResidentSources};
const gxResident={status:'READY',rule:'GUANGXI_ORDINARY',gxMakeup:true,paymentNote:'以后按所选年档正常交。历史断缴或提档只计已填且核对的年度，不补贴历史费用；本年提档只补应享与已享补贴的差额。制度过渡的60岁补足须另核，本页不自动安排。',base:186,baseYear:2025,tiers:[200,300,400,500,600,700,800,900,1000,1500,2000,3000,4000,5000,6000],subsidies:[35,40,45,60,65,70,100,120,150,175,200,200,200,200,200],extraYear:2,age65Extra:5,provincial:true,referenceLabel:'自治区参考 · 非市县完整待遇',referenceText:'按2025年自治区最低基础养老金186元（65岁以上191元）计算，未计市县加发。默认按逐年交满15年计算，也可选符合2023文件条件的明确年度断缴／提档，须填写可补起点和原记录；制度过渡的60岁补足尚未开放，不能只按当前年龄认定。',sources:gxResidentSources};
module.exports={gdEmployee,gxEmployee,gdResident,gxResident,gdEmployeeSources,gdResidentSources,gxEmployeeSources,gxResidentSources,municipalities:[...gdNames.map((name,i)=>({id:gdCodes[i],name,provinceId:'440000',province:'广东省'})),...gxNames.map((name,i)=>({id:gxCodes[i],name,provinceId:'450000',province:'广西壮族自治区'}))]};
