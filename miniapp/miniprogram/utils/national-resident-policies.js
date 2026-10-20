// One profile per province; do not infer municipality pensions or make-up eligibility.
const checkedAt='2026-10-21';
const source=(id,name,url,text)=>({id,name,url,text,publisher:'福建省人民政府／福建省人力资源和社会保障厅',checkedAt});
const fujian={status:'READY',rule:'FUJIAN_ORDINARY',provincial:true,base:190,baseYear:2025,effectiveFrom:'2026-01',tiers:[200,300,400,500,600,700,800,1000,1500,2000,2500,3000],subsidies:[40,50,60,70,80,90,100,120,140,160,180,200],extraYear:0,referenceLabel:'福建省级参考 · 未计市县加发',referenceText:'基础按已核2025年7月省最低190元，年缴按省定12档及对应补贴；市县额外提高、长缴及高龄加发暂不计。普通逐年交满15年、满60岁起领；历史补缴与过渡资格另核，不默认人人60岁可补足。',sources:[
 source('fj-resident-tier','福建省定居民养老12档与缴费补贴','https://rst.fujian.gov.cn/wz/cjwt/cxylbx/202009/t20200904_5380764.htm','省人社问答列2019年起12档：200/300/400/500/600/700/800/1000/1500/2000/2500/3000元，对应40/50/60/70/80/90/100/120/140/160/180/200元。仅省级档，未当作各市全部可选档。'),
 source('fj-resident-base','福建居民养老待遇申领及省级最低标准','https://www.fujian.gov.cn/nrrh/srst/202309/t20230922_6262907.htm','现页明确2025年7月1日起省定最低190元；市县可提高。按月申领以满60且按规定缴费、未享受其他基本养老待遇等条件为前提，不赋予任意补缴权限。'),
 source('fj-resident-formula','福建城乡居民保参保登记与账户计算说明','https://www.fujian.gov.cn/nrrh/srst/202309/t20230922_6262785.htm','省政府省人社办事指南：个人账户养老金为账户储存额除以139；登记和领取办理各有条件。历史本人缴费估算不虚构历年补贴和利息。')],paymentNote:'以后正常年度按所选省级档交。过去漏年、提档及原制度过渡须先核具体适用条件，本页先给逐年方案，不把当前档套到所有旧年。'};
module.exports={'350000':fujian};
