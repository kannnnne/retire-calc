# 项目约定

@/mnt/c/Users/21145/.codex/RTK.md

此仓库保留旧 Java 网页版，微信小程序源码位于 miniapp/。用户当前开发工具使用 D:/project/retire-calc-mini；该目录与 miniapp/ 是同一小程序的工作副本和 Git 副本，不是前后端两个服务。

每次代码修改后完成相关自动测试和 scripts/build-dev.ps1 编译，再同步相关代码、文档到本仓库并 commit、push。用户最新要求默认不使用电脑操作技能或 GUI 自动化；模拟器操作、手机实测、上传和公众平台操作给出简短步骤，由用户完成。没有实际执行的验证或上传不得报告为已完成。同步脚本 D:/project/retire-calc-mini/scripts/sync-git.ps1；删除源文件时同时检查 Git 副本，不自动删除无关文件。未成功上传或推送需如实说明。

用户明确暂不开启微信开发者工具服务端口，不调用 CLI 上传或反复要求开启。开发/体验版上传不等于送审或正式发布。不要提交 target、output、dist、node_modules、日志、project.private.config.json、后台页面快照或密钥。每轮只提交本任务相关修改。
