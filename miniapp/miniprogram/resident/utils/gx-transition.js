// 桂人社规〔2023〕2号第二（三）项；资格和补足年数由经办核定，不由年龄推定。
// 桂政办发〔2012〕40、152号已全区覆盖新农保、城居保。此处只核年份
// 上界，不把全覆盖追溯日期或2014年并轨时间当成每个县的原制度起点。
const COVERAGE_YEAR=2012;
function originalPeriod(value){const m=String(value||'').match(/^(\d{4})-(\d{2})$/);return !!(m&&+m[1]>=2009&&+m[1]<=COVERAGE_YEAR&&+m[2]>=1&&+m[2]<=12);}
function stale(result){return !!(result&&result.transition&&(result.transition.coverageYear!==COVERAGE_YEAR||!originalPeriod(result.transition.schemeStart)));}
function validate(f,{policy,age,years,birth,asOf}){
 if(f.gxTransitionEnabled!=null&&!['yes','no'].includes(f.gxTransitionEnabled))throw Error('请选择是否按经办核定的老参保人办法补足');
 if(f.gxTransitionEnabled!=='yes')return null;
 if(policy.rule!=='GUANGXI_ORDINARY')throw Error('本地区不能使用广西老参保人补足方案');
 if(age<60)throw Error('本入口只计算已满60岁、已获经办核定的补足方案');
 if(f.ageOnly)throw Error('老参保人补足请改填出生年月，核对制度建立时年龄');
 const schemeStart=f.gxTransitionStart||policy.gxSchemeStart||'';
 if(policy.gxSchemeStart&&schemeStart!==policy.gxSchemeStart)throw Error('原制度建立年月与所选区县已核日期不符，请核对参保地和经办记录');
 const match=String(schemeStart).match(/^(\d{4})-(\d{2})$/);
 if(!match||+match[1]<2009||+match[2]<1||+match[2]>12)throw Error('请填写经办确认的新农保或城居保建立年月（2009至2012年）');
 if(+match[1]>COVERAGE_YEAR)throw Error('广西2012年已实现新农保和城居保全覆盖；请填写当地原制度年月，不是2014年合并或本人首次缴费年月');
 const start=+match[1]*12+(+match[2]-1);
 if(start<=birth+45*12||start>=birth+60*12)throw Error('制度建立时须未满60岁、距60岁不足15年，不能按现在年龄判断');
 const sixtyYear=Math.floor((birth+720)/12),asYear=Math.floor(asOf/12),normalCurrentYear=asYear===sixtyYear&&f.paidThisYear==='no',requiredYears=sixtyYear-Number(match[1])+1-(normalCurrentYear?1:0)+(asYear>sixtyYear&&f.paidThisYear==='yes'?1:0);
 if(years>asYear-Number(match[1])+(f.paidThisYear==='yes'?1:0))throw Error('已缴年数超出原制度建立后的年度，制度前缴费或转入记录请另行核对');
 if(years<requiredYears)throw Error('已缴年数不足以包含制度建立至满60岁当年的逐年记录；请先核对应缴或断缴，不能全部按有补贴的过渡补足算');
 if(f.historyMode==='segments'){const paid=new Set();for(const r of f.segments||[])for(let y=Number(r.start);y<=Number(r.end);y++)paid.add(y);for(let y=Number(match[1]);y<=sixtyYear-(normalCurrentYear?1:0);y++)if(!paid.has(y))throw Error(y+'年缺少逐年缴费记录，不能按有补贴的过渡补足算');}
 if(f.never||years===0)throw Error('老参保人补足须有按规定逐年缴费记录，从未参保不能直接套用');
 if(years>=15)throw Error('已交够15年，无需使用老参保人补足方案');
 if(15-years-(normalCurrentYear?1:0)<=0)throw Error('今年正常缴费后就满15年，无需这项补足，请取消老参保人补足选项');
 if((f.gxMakeupRows||[]).length)throw Error('老参保人补足与历史补缴记录请分开核定，本次不能同时计算');
 if(f.gxTransitionReviewed!=='yes')throw Error('请先向经办核定老参保人补足资格和年数，再勾选确认');
 if(!/^\d+$/.test(String(f.gxTransitionYears))||Number(f.gxTransitionYears)!==15-years-(normalCurrentYear?1:0)||Number(f.gxTransitionYears)<1)throw Error('核定补足、已交年数及满60当年待缴应合计15年，请核对经办记录');
 return {years:Number(f.gxTransitionYears),schemeStart,requiredYears,normalCurrentYear,coverageYear:COVERAGE_YEAR,basis:'GX_2023_2_ARTICLE_2_3'};
}
module.exports={validate,stale};
