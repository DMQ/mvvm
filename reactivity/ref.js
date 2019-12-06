function isRef(r) {
    return r ? r._isRef === true : false;
}

function convert(val) {
    return typeof val === 'object' ? reactive(val) : val;
}

function ref(val) {
    if (isRef(val)) {
        return val;
    }

    val = convert(val); // 如果是对象，转成reactive响应式对象

    const refObj = {
        _isRef: true,

        get value () {
            track(refObj, 'get', 'value'); // 取值时，收集依赖（如果有的话）
            return val;
        },

        set value (newVal) {
            val = convert(newVal);
            trigger(refObj, 'set', 'value'); // 赋值时，触发依赖回调（如果有的话）
        }
    };

    return refObj;
}

function toRefs(obj) {
    const ret = {};
    for (const key in obj) {
        ret[key] = {
            _isRef: true,
            get value() {
                return obj[key];
            },
            set value(newVal) {
                obj[key] = newVal;
            }
        };
    }
    return ret;
}

window.ref = ref;
window.isRef = isRef;
window.toRefs = toRefs;