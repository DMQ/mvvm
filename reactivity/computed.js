function computed(fn) {
    let dirty = true;
    let val;

    const runner = effect(fn, {
        lazy: true,
        // 依赖输更新时只标记dirty，不马上执行runner，而是真正需要取值的时候才去跑runner(惰性取值)
        scheduler () {
            dirty = true;
        }
    });

    const ret = {
        _isRef: true, // reative 或者模板更新时，自动从value取值

        get value () {
            // 惰性取值
            if (dirty) {
                val = runner();
                dirty = false;
            }

            return val;
        },

        set value (newVal) {
            // noop
        }
    };

    return ret;
}

window.computed = computed;