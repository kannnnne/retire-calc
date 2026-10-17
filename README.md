# 穗 · 退休账本

微信小程序 **退休算盘** 源码在 [miniapp/](miniapp/README.md)，可独立导入微信开发者工具，纯本地计算，无需部署服务器。该目录保留小程序源码、测试和开发文档；下文是旧 Java 网页版及 Windows 便携版的运行方式。

广州企业职工养老金与个人续交规划小工具，含Windows便携版。Java17+ / Spring Boot3.5.6 / 原生HTML、CSS、ES modules，前端无需构建。

## 运行

```powershell
mvn test
mvn spring-boot:run
```

打开 http://127.0.0.1:8080 。默认只监听本机。当前开发环境Java21、Maven3.6.3；生成的代码目标Java17。

打包运行：

```powershell
mvn package
java -jar target/retire-calc-0.1.0.jar
```

无需数据库或用户登录，不保存个人权益记录、不记录计算请求正文。

## 当前版本：手机小工具与Windows便携版

首页为三步表单：基本情况、已有权益、续交计划。帮助和教程点击展开，结果独立一页；四种方案比较默认折叠。可以选择以后个人灵活就业续交（20%全额自付）或单位就业（只算本人8%）、先暂停几个月、指定只交多少个月。所有方式均按基数的8%增加个人账户，暂停月份不增加年限，不自动假设允许补缴。

输入本金与另查的账户利息，避免重复；核定指数可选，未知按0.6；当前基数默认5510。价格参数和未来利息保持不变/0。最低年限依照法定退休年份，不固定15年。原已缴月数与账户不会因断缴清零。参保资格、医保和补贴不自动办理或计算。

点“5年续交示例”填虚构数据：1985-06男职工、已交180个月、本金80000、个人最低档续交至240个月。自付1102元/月，60个月共66120，新增账户26448，预测月领2428.69，2048-07开始领取，约28个领取月累计养老金达到未来续交费用。此费用回收包括以前已有权益，不是续交投资收益；未计等待退休、通胀和资金时间价值。只有原年限已达门槛，才提供按新增待遇计算的费用回收。自选月数不足门槛时不提供领取月份、总养老金或回收期。

### Windows直接使用

`dist/Guangzhou-RetireCalc-0.2.0-win-x64.zip` 为约48MB的Windows x64便携包。解压整个目录，双击 `RetireCalc/RetireCalc.exe`。保留app和runtime文件夹，无需安装Java。EXE启动本机随机端口服务并打开默认浏览器；关闭启动窗口退出。这是自带运行时的便携应用，不能只复制单个EXE。已有本机8080服务可同时运行。

重新打包需Windows JDK21+jpackage以及Maven，先退出正在运行的开发JAR/EXE：

```powershell
powershell -ExecutionPolicy Bypass -File packaging/build-windows.ps1
```

打包脚本先clean/package并测试，再用jpackage生成便携程序及ZIP；不依赖WiX。每次输出独立时间戳目录。

教程使用用户提供的余额打码新图，原未打码资源已删除，页面示例金额为虚构数据。不保存请求。简易版仅适用1998-07后首次参保且无特殊历史权益的企业职工养老；原 `/api/calculate` 静态专业API保留。2026计发基数仍为本项目NOT_VERIFIED状态，使用2025已录入值，不能视为未来核定待遇。
## 文档

- [政策原文、公式、状态、待确认口径](docs/pension-policy.md)
- [需求与验收](docs/requirements.md)
- [计算流程与项目设计](docs/calculation-design.md)
- [测试与交叉验证记录](docs/verification.md)
- [广州数据获取与指数说明](docs/data-guide.md)

`domain`为计算组件，`policy`加载参数，`api`只做边界输入与响应。金额用BigDecimal DECIMAL128，时间用YearMonth及整月差。Controller中没有养老金算法。

## 更新年度参数

1. 从广东人社/省政府取得当年正式通知，确认广州适用值（不能用深圳单列值、缴费工资上下限或调待比例代替）。
2. 复制`src/main/resources/policy/guangdong.json`到外部文件，如`D:/project/retire-calc/config/guangdong.json`。添加年度行，填pensionBase、year、province、source、policyNumber、publishDate，将status设为OFFICIAL；保留历史行。没有官方依据不得填金额。
3. 增加对应政策登记，更新version和verifiedAt。检查source为官方HTTPS，未知状态NOT_VERIFIED，确认确未公布才使用NOT_PUBLISHED。记录核验依据和变更。
4. 设置外部路径再重启，无需重新编译核心算法：

```powershell
$env:PENSION_POLICY_FILE = 'file:D:/project/retire-calc/config/guangdong.json'
java -jar target/retire-calc-0.1.0.jar
```

5. 查看`GET /api/policies`版本，选择新退休年份验证参数快照；错误配置会启动失败。该MVP通过文件维护，没有公开管理员写接口。若变更公式而不是年度参数，必须重新核验并新增回归测试，不仅修改金额。

## API

`GET /api/policies`读取政策和年度配置；`POST /api/calculate`请求示例：

```json
{
  "birthMonth": "1985-06",
  "category": "MALE",
  "firstInsuredMonth": "2005-07",
  "dataAsOf": "2026-10",
  "actualContributionMonths": 240,
  "accountBalance": "180000.00",
  "averageIndex": "1.0000",
  "historyStatus": "NONE",
  "deemedMonths": 0,
  "baseMode": "LATEST_OFFICIAL"
}
```

金额/指数支持十进制字符串，月份YYYY-MM。category为MALE/FEMALE_55/FEMALE_50；historyStatus为NONE/CONFIRMED/UNKNOWN；baseMode为LATEST_OFFICIAL/ASSUMED（后者需assumedBase）。过渡性字段见CalculationRequest。所有分项可有PENDING状态，调用方不能将null当作0。合计不空也不表示资格满足，要另看contributionSatisfied及warnings。

averageIndex允许省略或null，表示未知；不自动补0.6或1.0。退休日期及缴费条件继续计算，基础及总额为空。

## 尚需确认

广东延迟退休后非整数年龄的计发月数、待遇核定舍入顺序、完整2026官方核定案例的金额交叉验收，详见政策与验证文档。官方测算平台需本人身份认证，本次采用公开官方案例复算，没有登录或使用真实个人账户。上线维护时需继续核验这些口径和新年度参数。




## 仓库结构与提交范围

当前采用一个仓库、一个Spring Boot项目。前端是原生HTML/CSS/JavaScript，与Java接口同源部署，Windows版复用同一份页面；无需单独npm项目，也无需拆成两个GitHub仓库。

```text
src/main/java/              Java接口、计算模型、桌面启动器
src/main/resources/static/  前端页面、样式、脚本与脱敏教程图
src/main/resources/policy/  可追溯的政策配置
src/test/                   自动测试与官方退休表测试数据
packaging/                  Windows打包脚本与使用说明
docs/                      需求、政策、模型、测试记录和官方依据
```

仓库只提交源码、测试、必要资源、官方依据和说明。target、dist、output、打包临时输入、日志、IDE缓存和派生政策截图均忽略。Windows便携包在本地生成，不随Git提交；运行packaging/build-windows.ps1可重新生成。

若以后前端改用独立框架或需要独立部署，可先在同仓库增加frontend/backend目录，保留共同发布与测试；只有独立团队、权限或发布周期确有需要时再拆仓库。

## 简易预测API

首页使用`POST /api/forecast`，例如：

```json
{
  "birthMonth": "1985-06",
  "category": "MALE",
  "firstInsuredMonth": "2005-07",
  "dataAsOf": "2026-10",
  "paidMonths": 180,
  "principal": "80000.00",
  "plan": "MINIMUM_STOP",
  "contributionType": "FLEXIBLE",
  "pauseMonths": 0,
  "customMonths": 60
}
```

响应包含四种方案、领取资格、后续自付费用、账户增量、预计待遇及费用回收期。静态专业API与此预测API的未知指数处理不同：预测允许显式估算0.6，静态API保留待核定状态。详见[预测模型](docs/forecast.md)。测试和文档金额为虚构值，不沿用用户真实余额。

