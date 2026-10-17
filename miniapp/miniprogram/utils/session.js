// Memory only. No disk persistence and no personal data in navigation URLs.
function app(){return typeof getApp==='function'?getApp():null;}
exports.save=(key,value)=>{const a=app();if(a){a.globalData.sessions=a.globalData.sessions||{};a.globalData.sessions[key]=JSON.parse(JSON.stringify(value));}};
exports.load=key=>{const a=app(),v=a&&a.globalData.sessions&&a.globalData.sessions[key];return v?JSON.parse(JSON.stringify(v)):null;};
