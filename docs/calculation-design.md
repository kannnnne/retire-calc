> 当前首页已于2026-10-08改为简易未来预测，见 [预测模型与界面](forecast.md)。本文原静态规则适用于保留的 /api/calculate。

# 计算与项目设计

单体Spring Boot、Java17+、同源静态HTML/CSS/ES module。无需Node构建。领域组件不依赖Controller；政策从外部JSON加载。GET /api/policies提供版本，POST /api/calculate无持久化计算。绑定127.0.0.1，不公开管理员写接口。

1. 解析YearMonth、BigDecimal；Bean Validation校验长度、范围、格式，领域校验跨字段。Clock注入Asia/Shanghai，禁止未来权益截至月份。
2. RetirementAgeCalculator按出生月份到改革分组起点的距离，floor(offset/group)+1，上限截断，算出法定月。ContributionYearCalculator按退休年份取得180—240个月。
3. 本次实际月数+视同月数为静态总月数。当前不足多少月只比较法定退休年门槛，未来是否达标未预测。不将退休前每个日历月都默认为缴费月。
4. PensionPolicyService按目标年份找正式参数或往年最新正式参数；用户假设值有独立状态。snapshot含目标年、参数年、值、模式、政策、版本。外部配置更新后重启加载，无需改算法。
5. averageIndex允许null，未知时基础PENDING、合计null，退休与缴费判断仍继续；已知时BasicPensionCalculator使用I<0.6修正。PersonalAccountPensionCalculator仅整数年龄查40—70国家表，非整数返回pending。
6. TransitionalPensionCalculator使用首次参保月及核定历史输入决定分支：历史数据未知→pending；1998前核定→历史综合指数×(视同+历史实际)；1998后有视同→视同指数×视同月；无视同→0。指数必须是对应口径，不能混用全程平均指数。
7. RetirementCalculator编排、收集警示、记录公式替换、各项来源，分项四舍五入2位再合计。任何pending合计null，缴费不足状态不影响数学演示但阻止“可领取”的文案。

外部参数文件结构：schemaVersion, version, verifiedAt, policies, pensionParameters, accountMonths。每个公式关联policyId。年度项包含year/province/pensionBase/source/policyNumber/publishDate/status。状态OFFICIAL/NOT_VERIFIED/NOT_PUBLISHED；用户假设只存在请求快照。默认classpath配置，设置PENSION_POLICY_FILE指向外部JSON，严格校验配置，错误时启动失败，禁止回退隐藏错误。参数更新步骤见README。

目录：src/main/java/cn/guangzhou/pension/{api,domain,policy}；resources/static；resources/policy；src/test/java；docs。领域公式以MathContext.DECIMAL128计算；无double金额。

测试层：组件金额与边界、服务阻断状态、官方案例、所有官方对照表行、MockMvc请求验证、Playwright浏览器流程与窄屏。公开案例和配置独立，不由实现生成期望数。已知不确定口径在policy文档记录，不能用测试给未经核验的规则背书。

