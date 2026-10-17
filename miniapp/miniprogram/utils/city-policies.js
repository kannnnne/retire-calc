// Administrative codes and independently reviewed capabilities. A registered city is NOT necessarily calculable.
const source=(id,name,url,text)=>({id,name,url,text});
const bjEmployee=[source('bj-range','北京2026年缴费上下限','https://www.beijing.gov.cn/zhengce/zcjd/202608/t20260821_4831683.html','2026年7月起7270—36348元；个人身份养老按20%缴费。'),source('bj-base','北京2025年养老金计发基数','https://www.beijing.gov.cn/fwcj/jiage/yanglaofuwu1/65d2ed2811a82834a86396d1.html','2025年计发基数12049元。参考标准，不代表未来退休年度金额。'),source('bj-rule','北京市基本养老保险规定','https://www.beijing.gov.cn/gongkai/zfxxgk/zc/gz/202112/t20211216_2562734.html','普通实际缴费人员按本市企业职工基本养老保险办法计算；不含特殊历史权益。')];
const shEmployee=[source('sh-range','上海2026年社平工资与缴费上下限','https://shanghai.chinatax.gov.cn/tax/zcfw/rdwd/202608/t481376.html','2025年度全口径月平均工资12577元；2026年7月起上下限7546—37731元。'),source('sh-rule','上海企业基本养老金计发办法','https://rsj.sh.gov.cn/tshbx_17729/20260813/t0035_1443100.html','沪人社规〔2026〕16号，2026年8月16日起施行。基础养老金按上年度全口径月平均工资与本人指数化月平均缴费工资的平均值，缴费每满一年发给1%。'),source('sh-flex','上海灵活就业参保说明','https://rsj.sh.gov.cn/dzb/rsj/2026-01-29/pdf/01.pdf','灵活就业参加企业职工养老保险；养老缴费20%，账户按基数8%入账。')];
const bjResident=[source('bj-resident-tier','北京2026年居民养老缴费标准','https://rsj.beijing.gov.cn/xxgk/2024zcwj/202603/t20260327_4567778.html','年缴金额可在1000至9000元之间自选；2026年缴费期4月1日至12月10日，不能当成以后每年的固定截止日期。'),source('bj-resident-subsidy','北京居民缴费补贴','https://rsj.beijing.gov.cn/xwsl/mtgz/202603/t20260330_4569980.html','年缴1000至不足2000补60元，2000至不足4000补90元，4000至不足6000补120元，6000至9000补150元。'),source('bj-resident-base','北京2025年居民待遇标准','https://www.beijing.gov.cn/zhengce/zhengcefagui/202509/t20250922_4207662.html','新领取人员基础养老金998元/月；本工具沿用2025参考标准，不预测未来上调。'),source('bj-resident-rule','北京2014年制度衔接通知','https://www.beijing.gov.cn/zhengce/zhengcefagui/201905/t20190522_58060.html','2015年及以后首次参加的普通参保人按60岁、满15年计算；不足年限继续缴费。原制度、女性55岁和历史补缴需另行核对，不能一律套用60岁。')];
const shResident=[source('sh-resident-rule','上海城乡居民基本养老保险办法','https://www.shanghai.gov.cn/qtsj/20250610/ef1f63e47f4d4d0697632a54aacc67cc.html','沪府规〔2023〕18号。普通领取条件60岁、累计15年；个人账户养老金为账户储存额除以139。制度建立时临近领取年龄的历史补缴另行办理，不是所有参保人都能一次补足。'),source('sh-resident-tier','上海居民年缴标准与补贴','https://rsj.sh.gov.cn/tshbx_17729/20240424/t0035_1423726.html','2024年5月起七档800、1300、1700、2300、3300、5300、7300元，对应补贴270、400、450、525、575、675、730元。'),source('sh-resident-base','上海2025年居民基础养老金','https://rsj.sh.gov.cn/tshbx_17729/20250801/t0035_1434563.html','2025年基础养老金1555元/月。本工具沿用该年标准，尚未计入未来上调。')];
const pending=reason=>({status:'PENDING',reason});
const cities=[
 {id:'440100',name:'广州市',provinceId:'440000',province:'广东省',employee:{status:'READY',legacy:true,sources:[]},resident:{status:'READY',legacy:true,sources:[]}},
 {id:'110100',name:'北京市',provinceId:'110000',province:'北京市',employee:{status:'READY',min:7270,max:36348,effectiveFrom:'2026-07',pensionBase:12049,year:2025,indexWage:12116,sources:bjEmployee},resident:{status:'READY',rule:'BEIJING_ORDINARY',base:998,baseYear:2025,tiers:[1000,2000,4000,6000,9000],subsidies:[60,90,120,150,150],continuous:true,subsidyLimitYears:15,sources:bjResident}},
 {id:'310100',name:'上海市',provinceId:'310000',province:'上海市',employee:{status:'READY',min:7546,max:37731,effectiveFrom:'2026-08',pensionBase:12577,year:2026,indexWage:12577,sources:shEmployee},resident:{status:'READY',rule:'SHANGHAI_ORDINARY',base:1555,baseYear:2025,tiers:[800,1300,1700,2300,3300,5300,7300],subsidies:[270,400,450,525,575,675,730],extraYear:20,sources:shResident}},
 {id:'440300',name:'深圳市',provinceId:'440000',province:'广东省',employee:{...pending('深圳户籍与非深圳户籍费率不同，省级统筹指数口径及地方补充待遇仍在核对，暂不生成领取金额。'),sources:[source('gd-2026-range','广东2026年职工养老缴费范围','https://guangdong.chinatax.gov.cn/gdsw/mmsw_gkwj/2026-10/13/content_87b090a21cbb45a3b8adb477f596793a.shtml','2026年1月起全省企业下限统一5510元，7月起5521—27603元，不再划分片区。'),source('sz-flex','深圳灵活就业参保缴费说明','https://hrss.sz.gov.cn/szsi/sbjxxgk/gzdt/content/post_12956467.html','深户21%、非深户20%，不能统一按20%计算。'),source('sz-base','深圳2025年养老金计发基数','https://hrss.sz.gov.cn/zmhd/cjwt/cjwt/shbz/content/post_12493488.html','2025年计发基数11293元，不能使用广州9493元。')]},resident:{...pending('深圳基础养老金与本市户籍年限有关，完整现行标准仍在核对，暂不套用广州数据。'),sources:[source('sz-resident','深圳居民养老参保登记','https://hrss.sz.gov.cn/szsi/zxbs/zdyw/gpywcj/jmylbxcbdj/','九档个人年缴180至4800元；补贴和领取条件按深圳规定执行。')]}},
 {id:'510100',name:'成都市',provinceId:'510000',province:'四川省'},
 {id:'330100',name:'杭州市',provinceId:'330000',province:'浙江省'},
 {id:'610100',name:'西安市',provinceId:'610000',province:'陕西省'}
];
const provincial=require('./province-policies');
for(const entry of provincial.municipalities){
 if(entry.id==='440100')continue;
 const previous=cities.find(c=>c.id===entry.id),isGuangdong=entry.provinceId==='440000';
 const employee={...(isGuangdong?provincial.gdEmployee:provincial.gxEmployee)};
 const resident={...(isGuangdong?provincial.gdResident:provincial.gxResident)};
 if(entry.id==='440300'){
  employee.rule='SHENZHEN_NONLOCAL';employee.pensionBase=11293;employee.nonLocalOnly=true;
  employee.referenceLabel='深圳非深户普通参保参考';
  employee.referenceText='限非深圳户籍、无地方补充养老权益的普通参保人。按2025年深圳计发基数11293元计算，未来指数暂按广东参考参数9493元计算；不含深户地方补助、历史特殊待遇及省市就高对比差额。';
  employee.sources=[...previous.employee.sources,source('sz-rule-2022','深圳企业养老省级统筹处理办法','https://www.sz.gov.cn/zfgb/2022/gb1253/content/post_10008776.html','深府规〔2022〕4号：统筹养老金、个人账户养老金按本市办法计算；计发基数过渡期间实行省市就高。本页仅给非深户普通情况参考，不替代就高核定。')];
  resident.sources=[...provincial.gdResidentSources,...previous.resident.sources];
 }
 const record={...entry,employee,resident};if(previous)Object.assign(previous,record);else cities.push(record);
}
const extended=require('./extended-policies');
for(const c of cities){
 const province=extended.provinceReferences[c.provinceId]||{},override=extended.cityOverrides[c.id]||{};
 for(const kind of ['employee','resident']){
  if(override[kind])c[kind]={...override[kind],scope:'CITY_REFERENCE',policyProvinceId:c.provinceId};
  else if((!c[kind]||c[kind].status==='PENDING')&&province[kind])c[kind]={...province[kind],scope:'PROVINCE_REFERENCE',policyProvinceId:c.provinceId};
 }
}
function city(id){return cities.find(c=>c.id===id)||null;}
function capability(id,kind){const c=city(id);return c?c[kind==='flexible'?'employee':kind]:null;}
function requireEmployee(id,asof){const c=city(id||'440100'),p=c&&c.employee;if(!p||p.status!=='READY')throw Error(p?p.reason:'请选择已开放的领取地区');if(!p.legacy&&asof<p.effectiveFrom)throw Error(c.name+'当前录入规则从'+p.effectiveFrom+'起使用，请核对数据截至月份');return p;}
module.exports={cities,city,capability,requireEmployee};
