// Keep the last calculated result recoverable while editing, in memory only.
const {icon} = require('./tool-icons');
const clone = value => JSON.parse(JSON.stringify(value));
module.exports = function withResultRecovery(definition, { key, session, wx }) {
  const page = { ...definition, data: { ...definition.data, resultEditIcon:icon('edit','#576579'), editingResult: false } };
  page.beginResultEdit = function () {
    if (!this.data.result && !(this.data.quickPlan && this.data.quickPlan.summary)) return;
    this._resultBackup = clone(this.data);
    if (this.data.quickPlan && this.data.moduleMode) this.moduleEdit();
    else this.edit();
    this.setData({ editingResult: true });
    session.save(key, this._resultBackup);
  };
  page.cancelResultEdit = function () {
    if (!this._resultBackup) return;
    const original = this._resultBackup;
    this._resultBackup = null;
    const cleared = Object.fromEntries(Object.keys(this.data).filter(k => !(k in original)).map(k => [k, null]));
    this.setData({ ...cleared, ...clone(original), editingResult: false });
    session.save(key, this.data);
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  };
  page.requestResultReset = function () {
    wx.showModal({
      title: '重置填写？',
      content: '清空当前填写和测算结果，恢复所选地区的默认值。',
      confirmText: '重置', cancelText: '取消',
      success: answer => { if (answer.confirm) this.reset(); }
    });
  };
  const reset = page.reset;
  page.reset = function (...args) {
    this._resultBackup = null;
    this.setData({ editingResult: false });
    return reset.apply(this, args);
  };
  for (const name of ['calculate', 'moduleCalculate']) {
    const calculate = page[name];
    if (!calculate) continue;
    page[name] = function (...args) {
      const previousQuick = this.data.quickPlan;
      const value = calculate.apply(this, args);
      if (this.data.result || (this.data.quickPlan && this.data.quickPlan.summary && this.data.quickPlan !== previousQuick)) {
        this._resultBackup = null;
        this.setData({ editingResult: false });
        session.save(key, this.data);
      }
      return value;
    };
  }
  for (const name of ['onHide', 'onUnload']) {
    const original = page[name];
    page[name] = function (...args) {
      if (this._resultBackup && !this.data.result) {
        session.save(key, this._resultBackup);
        return;
      }
      return original && original.apply(this, args);
    };
  }
  return page;
};
