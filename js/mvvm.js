class MVVM {
  constructor(options = {}) {
    this.$options = options;
    this._data = this.$options.data || {};
    this._proxyData(); // 数据代理,实现 vm.xxx -> vm._data.xxx
    this._initComputed(this.$options);
    observer(this._data); // 劫持监听所有数据属性
    this.$compile = new Compile(options.el, this); // 解析指令
  }

  $watch(key, cb) {
    new Watcher(this, key, cb);
  }

  _proxyData() {
    Object.keys(this._data).forEach((key) => {
      Object.defineProperty(this, key, {
        enumerable: true,
        get() {
          return this._data[key];
        },
        set(newVal) {
          this._data[key] = newVal;
        },
      });
    });
  }

  _initComputed({ computed = {} }) {
    Object.keys(computed).forEach((key) => {
      Object.defineProperty(this, key, {
        get:
          typeof computed[key] === "function"
            ? computed[key]
            : computed[key].get,
        set: function () {},
      });
    });
  }
}
