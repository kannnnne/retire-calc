# 文案与相册保存检查（2026-11-11，2.51.1）

## 实际修改

遍历app.json中全部12个页面、全部运行JS/WXML/JSON以及分享备用文案。删除“不接入广告和第三方统计服务”“无需登录”“不上传、不保存”等宣传或绝对承诺。保留隐私入口、填写资料的使用用途、保存相册与剪贴板操作说明及微信平台说明；没有删除隐私保护指引或更改数据处理行为。首页、计算、方案表和分享卡布局不变。

同步当前简介、审核说明及备案备注草稿：branding/profile-draft.md、docs/launch.md、docs/release.md、docs/record-correction.md。历史原提交文本/政策研究保留可追溯事实，不代表当前公开文案；备案历史文档加停用旧稿说明。不把内部技术实现描述误当宣传文案删除。

## 保存图片

此前直接调用saveImageToPhotosAlbum，任何fail都显示相册权限提示，因此不能仅凭旧提示断定手机拒绝授权。未发现人为禁止相册保存的代码；原真实小程序码完整性检查保留。

现在先读取getSetting；scope.writePhotosAlbum未决定或已允许时调用原生保存接口，首次授权由微信处理；明确拒绝时显示用户主动点击的openSetting按钮。设置返回后提示再次保存，不自动写相册。取消保持可重试；读取设置失败不写相册。

保存失败分类：小程序相册权限、手机系统权限、隐私声明或授权、图片文件失效、存储空间不足、其他错误。隐私错误可查看微信隐私保护指引；文件错误可重新生成。没有增加读取照片或绕过授权行为，也未在app.json错误添加不支持的相册permission声明。

**后台待核对**：公众平台用户隐私保护指引是否已声明“相册（仅写入）”，用途“将用户生成的测算方案图片保存到设备相册”。若微信返回隐私接口未声明，必须在后台补充并按平台要求发布指引，仅改JS不能代替。若返回系统权限拒绝，需要用户在手机设置允许微信保存照片。此次无真实设备错误日志，无法判定原故障的唯一原因，不能声称已在手机修复成功。

## 验证与发布边界

1180项测试通过，原生WXML/WXSS编译通过。新增拒绝/恢复、首次授权、查询失败、隐私/系统/文件/空间/取消分支及全运行文本扫描。原三个日期敏感用例显式固定2026-10，避免11月运行时被当成算法回归；产品日期逻辑不变。未操作手机、相册、微信后台或上传发布，线上版本和后台简介不会随本地代码修改自动更新。

## 当前公开文案

简介：支持职工养老、灵活就业和城乡居民养老参考测算，查看预计领取时间、每月金额、后续缴费费用，并对比居民养老缴费档次。结果仅供参考，以社保核定为准。

版本说明：优化说明文案与方案图片保存流程，增加相册授权恢复入口，完善保存失败提示。

## 接口参考

- https://developers.weixin.qq.com/miniprogram/dev/api/media/image/wx.saveImageToPhotosAlbum.html
- https://developers.weixin.qq.com/miniprogram/dev/api/open-api/setting/wx.getSetting.html
- https://developers.weixin.qq.com/miniprogram/dev/api/open-api/setting/wx.openSetting.html
- https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html

微信原站本次检索直访不可用；已有接口与行为在单元桩中验证，不将腾讯云SuperApp文档或第三方文章当作微信小程序平台规定核验完成。
