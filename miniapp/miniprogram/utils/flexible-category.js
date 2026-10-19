// Original retirement category; the national progressive delay is applied by forecast.retirement.
const all=['MALE','FEMALE_55','FEMALE_50'];
const labels={MALE:'男性（原60岁）',FEMALE_55:'女性（原55岁）',FEMALE_50:'女性（原50岁）'};
function rule(regionId){const c=require('./city-policies').city(regionId||'440100');return c&&c.provinceId==='440000'?'GUANGDONG_HISTORY':c&&c.provinceId==='450000'?'GUANGXI_CURRENT_IDENTITY':null;}
function options(regionId,unitMonths){const r=rule(regionId),restricted=r==='GUANGXI_CURRENT_IDENTITY'||r==='GUANGDONG_HISTORY'&&unitMonths===0;const values=restricted?all.slice(0,2):all.slice();return {values,labels:values.map(v=>labels[v]),restricted,note:r==='GUANGXI_CURRENT_IDENTITY'?'退休时仍以灵活就业身份参保，按原55岁类别，已计延迟退休。':restricted?'没有单位职工参保记录，按原55岁类别，已计延迟退休。':''};}
function validate(regionId,category,unitMonths,paidMonths){
 if(category!=='FEMALE_50')return;
 const r=rule(regionId);
 if(r==='GUANGXI_CURRENT_IDENTITY')throw Error('广西退休时仍以灵活就业身份参保的女性，请选原55岁类别；已有单位年限不直接改为原50岁');
 if(r==='GUANGDONG_HISTORY'&&(!Number.isInteger(unitMonths)||unitMonths<=0||unitMonths>paidMonths))throw Error('广东一直自己交、没有单位职工参保记录的女性，请选原55岁类别；原50岁需核对单位参保经历和岗位');
}
module.exports={options,validate,rule};
