// Selected, precomputed scenarios only. The wide table remains one shareable PNG.
function layout(table,reveal,hasCode){
 const count=table.columns.length,W=Math.min(3800,Math.max(1000,278+230*count)),pad=44,labelW=190,cw=(W-pad*2-labelW)/count,ops=[];
 const rect=(x,y,w,h,color)=>ops.push({op:'rect',x,y,w,h,color});
 const text=(s,x,y,size=28,color='#182c47',weight='normal')=>ops.push({op:'text',text:String(s),x,y,size,color,weight});
 function wrap(s,size,max){const lines=[];let line='',width=0;for(const c of String(s)){const w=(c.charCodeAt(0)<128?.56:1)*size;if(c==='\n'||width+w>max){lines.push(line);line='';width=0;if(c==='\n')continue;}line+=c;width+=w;}if(line)lines.push(line);return lines;}
 rect(0,0,W,160,'#edf3ff');text('退休算盘 · 居民养老',pad,55,28,'#245bc1','bold');text('缴费方案对比',pad,118,32,'#182c47','bold');
 let y=212;for(const line of wrap(table.region+' · '+table.asOf+' · 缴费方案对比',26,W-pad*2)){text(line,pad,y,26,'#506078');y+=38;}y+=24;
 if(table.facts&&table.facts.length){for(const fact of table.facts){for(const line of wrap(fact.label+'：'+fact.value,25,W-pad*2)){text(line,pad,y,25,'#506078');y+=36;}}y+=20;}
 const heads=table.columns.map((c,i)=>wrap(c.label,27,cw-24));
 const headerH=Math.max(...heads.map((ls,i)=>ls.length*40+(table.columns[i].current?32:0)))+28;
 rect(pad,y,W-pad*2,headerH,'#f2f5fa');text('方案年档',pad+12,y+44,27);
 heads.forEach((ls,i)=>{ls.forEach((line,n)=>text(line,pad+labelW+i*cw+12,y+38+n*40,27,'#182c47','bold'));if(table.columns[i].current)text('当前方案',pad+labelW+i*cw+12,y+38+ls.length*40,23,'#506078');});y+=headerH;
 for(const row of table.rows){
  const values=row.values.map(v=>!reveal&&row.label==='每月约领'?'****':v);
  const cells=[wrap(row.label,27,labelW-24),...values.map(v=>wrap(v,30,cw-24))],height=Math.max(...cells.map(c=>c.length))*46+32;
  rect(pad,y,W-pad*2,height,row.label==='每月约领'?'#edf3ff':row.kind==='balance'?'#f5f8fd':'#ffffff');rect(pad,y,W-pad*2,1,'#dce4ef');
  cells.forEach((ls,i)=>{if(i)rect(pad+labelW+(i-1)*cw,y,1,height,'#e5eaf2');ls.forEach((line,n)=>text(line,i===0?pad+12:pad+labelW+(i-1)*cw+12,y+42+n*46,i===0?27:30,row.label==='每月约领'&&i>0?'#245bc1':i===0?'#506078':row.kind==='balance'?(row.tones[i-1]==='positive'?'#176652':row.tones[i-1]==='negative'?'#a33736':'#506078'):'#182c47',i>0?'bold':'normal'));});y+=height;
 }
 if(table.balanceBasis){text('净额＝'+table.balanceBasis,pad,y+42,24,'#506078');y+=58;}
 y+=36;
 if(hasCode){ops.push({op:'code',x:pad,y,w:200,h:200});text('长按识别小程序码',pad+240,y+78,28);text('算算自己的方案',pad+240,y+122,28);y+=226;}
 text('结果仅供参考，以社保核定为准。',pad,y+24,25,'#506078');return {width:W,height:Math.ceil(y+68),ops};
}
module.exports={layout};
