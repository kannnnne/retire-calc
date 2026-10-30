// One readable PNG: at most three plans per block, all selected plans retained.
function layout(table,reveal,hasCode){
 const W=1000,pad=44,inner=W-pad*2,labelW=210,ops=[];
 const rect=(x,y,w,h,color)=>ops.push({op:'rect',x,y,w,h,color});
 const text=(s,x,y,size=28,color='#182c47',weight='normal')=>ops.push({op:'text',text:String(s),x,y,size,color,weight});
 function wrap(s,size,max){const lines=[];let line='',width=0;for(const c of String(s)){const w=(c.charCodeAt(0)<128?.56:1)*size;if(c==='\n'||width+w>max){lines.push(line);line='';width=0;if(c==='\n')continue;}line+=c;width+=w;}if(line)lines.push(line);return lines;}
 rect(0,0,W,138,'#edf3ff');text('退休算盘 · 居民养老',pad,49,26,'#245bc1','bold');text('缴费方案对比',pad,104,32,'#182c47','bold');
 let y=185;text(table.region+' · '+table.asOf,pad,y,26,'#506078');y+=44;
 const facts=(table.facts||[]).filter(f=>!(['当前账户','历史自费'].includes(f.label)&&/^0 元$/.test(f.value))),scope=facts.filter(f=>f.label==='方案范围'),compact=facts.filter(f=>f.label!=='方案范围');
 for(let i=0;i<compact.length;i+=2){let height=0;for(let j=0;j<2&&i+j<compact.length;j++){const f=compact[i+j],x=pad+j*(inner/2+12),lines=wrap(f.label+'：'+f.value,25,inner/2-24);lines.forEach((s,n)=>text(s,x,y+n*36,25,'#506078'));height=Math.max(height,lines.length*36);}y+=height+8;}
 for(const f of [...scope,...(table.shared||[])]){const lines=wrap((f.label==='方案范围'?'':f.label+'：')+f.value,25,inner);for(const line of lines){text(line,pad,y,25,'#506078');y+=36;}}y+=22;
 const groups=[];for(let i=0;i<table.columns.length;i+=3)groups.push({start:i,columns:table.columns.slice(i,i+3)});
 function grid(group,rows){
  const count=group.columns.length,cw=(inner-labelW)/count,heads=group.columns.map(c=>wrap(c.label,27,cw-24));
  const headerH=Math.max(...heads.map((ls,i)=>ls.length*40+(group.columns[i].current?32:0)))+28;
  rect(pad,y,inner,headerH,'#f2f5fa');text('以后年缴',pad+12,y+42,27);
  heads.forEach((ls,i)=>{ls.forEach((line,n)=>text(line,pad+labelW+i*cw+12,y+38+n*40,27,'#182c47','bold'));if(group.columns[i].current)text('当前方案',pad+labelW+i*cw+12,y+38+ls.length*40,23,'#506078');});y+=headerH;
  for(const row of rows){const values=row.values.slice(group.start,group.start+count).map(v=>!reveal&&row.id==='monthly'?'****':v),emphasis=['cost','income'].includes(row.kind),size=emphasis?40:32;
   const cells=[wrap(row.label,30,labelW-24),...values.map(v=>wrap(v,size,cw-24))],height=Math.max(...cells.map(c=>c.length))*52+32;
   rect(pad,y,inner,height,row.kind==='income'?'#edf3ff':row.kind==='cost'?'#f5f8fd':row.kind==='balance'?'#f7f9fc':'#fff');rect(pad,y,inner,1,'#dce4ef');
   cells.forEach((ls,i)=>{if(i)rect(pad+labelW+(i-1)*cw,y,1,height,'#e5eaf2');const tone=row.tones?.[group.start+i-1];ls.forEach((line,n)=>text(line,i===0?pad+12:pad+labelW+(i-1)*cw+12,y+45+n*52,i===0?30:size,i===0?'#506078':row.kind==='income'?'#245bc1':row.kind==='balance'?(tone==='positive'?'#a33736':tone==='negative'?'#176652':'#506078'):'#182c47',emphasis&&i>0||row.kind==='balance'&&i>0?'bold':'normal'));});y+=height;
  }
 }
 groups.forEach((group,index)=>{if(index){y+=40;rect(pad,y,inner,2,'#dce4ef');y+=44;}if(groups.length>1){text('第'+(index+1)+'组 / 共'+groups.length+'组',pad,y,25,'#506078');y+=28;}
  grid(group,table.rows.filter(r=>r.section!=='extra'));y+=38;text('领取明细 · 领取'+(table.period||20)+'年',pad,y,25,'#506078');y+=22;grid(group,table.rows.filter(r=>r.section==='extra'));
 });
 for(const line of wrap(table.recoveryBasis||'',23,inner)){text(line,pad,y+36,23,'#506078');y+=33;}
 for(const line of wrap('扣除缴费后＝'+table.balanceBasis,23,inner)){text(line,pad,y+36,23,'#506078');y+=33;}y+=72;
 if(hasCode){const codeX=W-pad-180;ops.push({op:'code',x:codeX,y,w:180,h:180});['长按识别小程序码','算算自己的方案'].forEach((s,i)=>{const w=Array.from(s).reduce((n,c)=>n+(c.charCodeAt(0)<128?.56:1)*27,0);text(s,codeX-36-w,y+68+i*42,27);});y+=204;}
 text('结果仅供参考，以社保核定为准。',pad,y+24,24,'#506078');return {width:W,height:Math.ceil(y+68),ops};
}
module.exports={layout};
