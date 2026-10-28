// Main menu destinations start a fresh page stack; detail pages keep navigateTo.
const routes={home:'/pages/home/home',employee:'/pages/index/index',flexible:'/flexible/pages/calc/calc',resident:'/resident/pages/home/home'};
function open(key,api){if(Object.prototype.hasOwnProperty.call(routes,key))api.reLaunch({url:routes[key]});}
module.exports={open};
