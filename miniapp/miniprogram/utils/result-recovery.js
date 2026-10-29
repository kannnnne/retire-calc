// Keep the last calculated result recoverable while editing, in memory only.
const {icon} = require('./tool-icons');
const clone = value => JSON.parse(JSON.stringify(value));
module.exports = function withResultRecovery(definition, { key, session, wx }) {
  const page = { ...definition, data: { ...definition.data, resultEditIcon:icon('edit','#576579'), resultResetIcon:icon('reset','#576579'), editingResult: false } };
  page.beginResultEdit = function () {
    if (!this.data.result) return;
    this._resultBackup = clone(this.data);
    this.edit();
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
    if (!this.data.result && !this._resultBackup) { this.reset(); return; }
    wx.showModal({
      title: '重新填写？',
      content: '将清空这次填写和测算结果，保留所选地区。',
      confirmText: '重新填写', cancelText: '保留结果',
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
      const value = calculate.apply(this, args);
      if (this.data.result) {
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
