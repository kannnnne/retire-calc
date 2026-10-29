// Single display list used by WeChat canvas and local image verification.
function layout(m,hasCode){
 const ops=[],W=750,pad=56,inner=W-pad*2;
 const rect=(x,y,w,h,color)=>ops.push({op:'rect',x,y,w,h,color});
 const text=(value,x,y,size,color='#182c47',weight='normal')=>ops.push({op:'text',text:String(value),x,y,size,color,weight});
 const width=(s,size)=>Array.from(s).reduce((n,c)=>n+(c.charCodeAt(0)<128?0.56:1)*size,0);
 function lines(s,size,max=inner){const out=[];let line='';for(const c of String(s)){if(c==='\n'){out.push(line);line='';continue;}if(line&&width(line+c,size)>max){out.push(line);line='';}line+=c;}if(line)out.push(line);return out;}
 function para(s,y,size=24,color='#506078',max=inner){for(const line of lines(s,size,max)){text(line,pad,y,size,color);y+=size*1.55;}return y;}
 rect(0,0,W,132,'#edf3ff');text(m.brand,pad,52,26,'#245bc1','bold');text(m.type,pad,91,22,'#506078');
 let y=192;for(const line of m.title){text(line,pad,y,46,'#182c47','bold');y+=62;}y+=12;
 if(m.personal){y=para(m.region,y,23);y+=24;text('预计每月领取',pad,y,24);y+=86;
 const size=Math.min(78,Math.floor(inner/(Math.max(m.monthly.length,4)*0.6+1)));text(m.monthly,pad,y,size,'#245bc1','bold');text('元／月',pad,y+43,24,'#506078');y+=96;
 y=para(m.receipt+' 起领',y,29,'#182c47');y+=28;
 for(const row of m.rows){rect(pad,y-10,inner,1,'#dce4ef');text(row.label,pad,y+28,23,'#506078');y+=70;for(const line of lines(row.value,32)){text(line,pad,y,32,'#182c47','bold');y+=43;}y+=10;}
 }else{y=para(m.description,y+16,32,'#182c47');y+=44;}
 y+=12;rect(pad,y,inner,2,'#dce4ef');y+=40;
 for(const note of m.notes){y=para(note,y,23);y+=14;}y+=26;
 rect(pad,y,inner,1,'#dce4ef');y+=32;
 if(hasCode){ops.push({op:'code',x:pad,y,w:216,h:216});const label=lines('长按识别小程序码\n算算自己的情况',25,inner-248);label.forEach((s,i)=>text(s,pad+248,y+76+i*42,25));y+=248;}
 else{y=para('预览 · 尚未接入正式小程序码',y+22,24,'#506078');y+=28;}
 text('情景测算，不是待遇核定或缴费凭证',pad,y,21,'#506078');y+=54;
 return {width:W,height:Math.ceil(y),ops};
}
function draw(ctx,card,code){ctx.setFillStyle('#ffffff');ctx.fillRect(0,0,card.width,card.height);ctx.setTextBaseline('alphabetic');for(const o of card.ops){if(o.op==='rect'){ctx.setFillStyle(o.color);ctx.fillRect(o.x,o.y,o.w,o.h);}if(o.op==='text'){ctx.setFillStyle(o.color);ctx.font=(o.weight==='bold'?'bold ':'')+o.size+'px sans-serif';ctx.fillText(o.text,o.x,o.y);}if(o.op==='code'&&code)ctx.drawImage(code,o.x,o.y,o.w,o.h);}}
module.exports={layout,draw};
