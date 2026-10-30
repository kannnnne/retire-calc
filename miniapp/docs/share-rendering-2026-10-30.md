# 分享图与表格固定列

2.40.0，2026-10-30。

个人图统一750px宽、白底、浅蓝页眉、深色正文和蓝色金额。去掉两行大号口号，地区、月领与起领信息直接接页眉。PK标题改为较小的“缴费方案对比”；费用、日期、二维码和一句参考提示保留，十五档仍一张宽图，不挤压或删列。

绘图由旧createCanvasContext命令队列切换为Canvas 2D。通过页面selector获取真实node，为每次生成设置canvas.width/height并重置绘图状态；逐项设置fillStyle/font，首先绘制完整白底。用canvas.createImage等待真实码加载后绘制，canvasToTempFilePath传canvas node及同尺寸源/目标区域，不混用CSS尺寸。预览容器用原图高宽百分比占位，image的aspectFit铺满容器，避免默认尺寸或裁切。导出canvas保持离屏，不能靠opacity或z-index藏在视口中：模拟器实测仍可能遮挡UI。序号防旧结果覆盖、超时、失败和保存权限处理保留。

对比左侧170rpx标签列在scroll-view外，右侧仅数值列横滑，不依赖原生滚动容器内的position:sticky。标题及数据行两侧共用根据换行计算的高度；两档填满、三档以上各210rpx，年度/月领等行依然对齐。没有变更任何测算公式或候选方案。

验证：1119项自动测试和原生WXML/WXSS编译通过。测试覆盖Canvas node导出宽高、预览比例、首笔完整不透明白底、口号移除、原有异常/隐藏金额重绘等。微信开发者工具iPhone 5模拟器实际用广州默认方案全选七档并向高档拖动：固定行名可见、两侧行线对齐；进入分享成功生成完整白底宽图，比例正确；返回后生成居民单方案图，文字清晰、无大口号，页面可滚动查看二维码。灵活就业Canvas 2D图也生成成功，随后将导出canvas移离视口解决其遮挡界面的实测问题。离线按同一生产绘图指令查看职工/灵活/居民与全部十五档PNG，十五档3728×1264，未超过3800上限。

未本轮手机相册/扫码验证，未上传。手机端仍需重新预览本版确认，不用旧缓存截图判断新图。参考[微信Canvas示例](https://github.com/wechat-miniprogram/wxml-to-canvas)及[腾讯云画布导出说明](https://main.qcloudimg.com/raw/document/intl/product/pdf/tencent-cloud_1219_57657_zh.pdf)。
