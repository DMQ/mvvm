const rawToReactive = new WeakMap(); // 记录ractive对象到原始对象的映射
const reactiveToRaw = new WeakMap(); // 记录原始对象到reactive对象的映射

function reactive(target) {
    // proxy 只能代理对象
    if (typeof target !== 'object') return;

    // 传入对象是reactive过的原始对象，直接返回其代理对象
    let observed = rawToReactive.get(target);
    if (observed) return observed;

    // 传入对象是已经被reactive过的代理对象，直接返回代理对象
    if (reactiveToRaw.has(target)) return target;

    observed = new Proxy(target, {
        set (target, key, newVal) {
            const oldVal = target[key];
            // 拿到原始值，因为新值可能是proxy实例
            newVal = reactiveToRaw.get(newVal) || newVal;
            // 旧值是响应式的，直接将其value赋值为新值即可，会触发trigger
            // if (isRef(oldVal) && !isRef(value)) {
            //     oldVal.value = value;
            //     return;
            // }

            // 给原始对象设置好新值
            Reflect.set(target, key, newVal);

            if (oldVal !== newVal) {
                trigger(target, 'set', key);
            }
        },

        get (target, key) {
            let res = Reflect.get(target, key);

            // 该值是响应式的，直接将其value返回，会触发track
            if (isRef(res)) return res.value;

            track(target, 'get', key);

            // 如果是对象，返回其reactive的代理值（惰性响应）
            return typeof res === 'object'
                ? reactive(res)
                : res;
        }
    });

    return observed;
}

window.reactive = reactive;