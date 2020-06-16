function MVVM(options) {
    this.$options = options || {};
    var data = this._data = this.$options.data;
    var me = this;

    // 数据代理
    // 实现 vm.xxx -> vm._data.xxx
    Object.keys(data).forEach(function (key) {
        me._proxyData(key);
    });

    // 代理methods
    // 实现 vm.xxx -> vm.options.methods.xxx
    Object.keys(me.$options.methods).forEach(function (key) {
        me._proxyAttribute(key, me.$options.methods, me)
    });

    this._initComputed();

    observe(data, this);

    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    constructor: MVVM,
    $watch: function (key, cb, options) {
        new Watcher(this, key, cb);
    },

    _proxyData: function (key, setter, getter) {
        var me = this;
        setter = setter ||
            Object.defineProperty(me, key, {
                configurable: false,
                enumerable: true,
                get: function proxyGetter() {
                    return me._data[key];
                },
                set: function proxySetter(newVal) {
                    me._data[key] = newVal;
                }
            });
    },

     /**
      * 
      * @param {*} key source的一个要被代理的属性名
      * @param {*} source  source的各个属性被代理到target
      * @param {*} target  target[key] 可以访问到source[key]
      */
     _proxyAttribute: function (key, source, target) {
         Object.defineProperty(target, key, {
             configurable: false,
             enumerable: false,
             get: function proxyGetter() {
                 return source[key];
             },
             set: function proxySetter(newVal) {
                 source[key] = newVal;
             }
         });
     },

    _initComputed: function () {
        var me = this;
        var computed = this.$options.computed;
        if (typeof computed === 'object') {
            Object.keys(computed).forEach(function (key) {
                Object.defineProperty(me, key, {
                    get: typeof computed[key] === 'function' ?
                        computed[key] :
                        computed[key].get,
                    set: function () {}
                });
            });
        }
    }
};