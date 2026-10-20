// Presentation only: use the slower estimate, rounded up to whole years.
function recoveryYears(months){if(months==null||months==='')return '—';const n=Number(months);return Number.isFinite(n)&&n>=0?Math.ceil(n/12)+'年':'—';}
module.exports={recoveryYears};
