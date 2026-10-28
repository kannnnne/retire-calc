const session=require('../../../utils/session'),brand=require('../../../utils/brand');
Page({data:{brand},open(e){const paths={basic:'/resident/pages/basic/basic',makeup:'/resident/pages/calc/calc?module=makeup'};const url=paths[e.currentTarget.dataset.kind];if(url)wx.navigateTo({url});},onShareAppMessage(){return {title:brand.name+' · 居民养老',path:'/resident/pages/home/home'};}});
