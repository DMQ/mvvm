let obj = {};

obj = new Proxy(obj, {
    set (target, key, val) {
        console.log('set', key, ':', val);
        return Reflect.set(target, key, val);
    },

    get (target, key) {
        console.log('get', key);
        return Reflect.get(target, key);
    },
});

module.exports = obj;