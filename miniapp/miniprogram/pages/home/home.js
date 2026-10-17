const tools=require('../../utils/tools');
const brand=require('../../utils/brand');
Page({data:{tools,brand,active:'home'},onLoad(q={}){this.setData({active:q.view==='tools'?'tools':'home'});},open(e){const t=tools.find(t=>t.id===e.currentTarget.dataset.id);if(t)wx.redirectTo({url:t.path});},help(){wx.navigateTo({url:'/pages/help/help'});},onShareAppMessage(){return {title:brand.name+' · 养老计算',path:'/pages/home/home'};}});
