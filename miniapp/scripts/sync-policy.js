const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, '../miniprogram/utils');
const policy = JSON.parse(fs.readFileSync(path.join(dir, 'policy.json'), 'utf8'));
fs.writeFileSync(path.join(dir, 'policy-data.js'), 'module.exports = ' + JSON.stringify(policy, null, 2) + ';\n');
console.log('已同步小程序政策模块，请运行 npm test。');
