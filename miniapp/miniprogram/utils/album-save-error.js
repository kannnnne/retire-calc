// Preserve the actual failure category; not every save failure is a permission denial.
module.exports=function classify(error){
 const message=String(error&&error.errMsg||'');
 if(/cancel/i.test(message))return {kind:'',text:''};
 if(/privacy|隐私|api.*(?:declare|declar)|not declared/i.test(message))return {kind:'privacy',text:'保存图片需要完成微信隐私授权。若提示接口未声明，请等待开发者更新隐私保护指引后重试。'};
 if(/system.*(?:deny|denied|permission)|(?:deny|denied).*system|系统.*权限/i.test(message))return {kind:'system',text:'微信没有手机相册的访问权限，请在手机系统设置中允许微信保存照片后重试。'};
 if(/auth|permission|deny|denied|权限/i.test(message))return {kind:'album',text:'相册权限未开启。请开启后，再点保存图片。'};
 if(/space|storage|disk.*full/i.test(message))return {kind:'storage',text:'手机存储空间不足，请清理空间后重试。'};
 if(/file|path|exist|图片/i.test(message))return {kind:'file',text:'图片文件暂时不可用，请重新生成后保存。'};
 return {kind:'unknown',text:'图片未保存成功，请重试；也可点开大图后长按保存，或直接分享给微信好友。'};
};
