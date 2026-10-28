const navigation=require('../../utils/root-navigation');
const tools=require('../../utils/tools');
const brand=require('../../utils/brand');
const {icon}=require('../../utils/tool-icons');
Page({data:{tools:tools.map(t=>({...t,icon:icon(t.id)})),brand,active:'home'},onLoad(q={}){this.setData({active:q.view==='tools'?'tools':'home'});},open(e){const t=tools.find(t=>t.id===e.currentTarget.dataset.id);if(t)navigation.open(t.id,wx);},help(){wx.navigateTo({url:'/pages/help/help'});},onShareAppMessage(){return {title:brand.name+' · 养老计算',path:'/pages/home/home'};}});
