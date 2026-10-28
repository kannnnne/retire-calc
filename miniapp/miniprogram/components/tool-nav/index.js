const navigation=require('../../utils/root-navigation');
const {icon}=require('../../utils/tool-icons');
const items=[['home','首页'],['employee','职工养老'],['flexible','灵活就业'],['resident','居民养老']].map(([key,label])=>({key,label,icon:icon(key,'#66758b'),selectedIcon:icon(key)}));
Component({data:{items},properties:{active:String,residentHub:{type:Boolean,value:false}},methods:{go(e){const key=e.currentTarget.dataset.key;const nested=typeof getCurrentPages==='function'&&getCurrentPages().length>1;if(key===this.properties.active&&!(key==='resident'&&this.properties.residentHub)&&!nested)return;navigation.open(key,wx);}}});
