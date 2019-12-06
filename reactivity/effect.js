const effectStack = [];
const targetMap = new WeakMap();

function isEffect(fn) {
    return fn ? fn._isEffect === true : false;
}

function effect(fn, options = {}) {
    if (isEffect(fn)) {
        return fn;
    }

    // 创建一个响应式的函数返回
    const reactiveEffect = createReactiveEffect(fn, options);

    // 如果不是懒加载，需要马上执行以下回调，触发属性的getter，将fn添加进属性的更新依赖里面，属性有变动时，才会触发更新
    if (!options.lazy) {
        reactiveEffect();
    }

    return reactiveEffect;
}

function createReactiveEffect(fn, options) {
    const effectFn = function (...args) {
        return run(effectFn, fn, args);
    }

    effectFn._isEffect = true;
    effectFn.deps = [];
    effectFn.options = options;
    return effectFn;
}

function run(effectFn, fn, args) {
    if (!effectStack.includes(effectFn)) {
        try {
            effectStack.push(effectFn);
            return fn(...args);
        } finally {
            effectStack.pop();
        }
    }
}

function track(target, type, key) {
    if (effectStack.length === 0) return;

    const effectFn = effectStack[effectStack.length - 1];

    // 取出对象对应的依赖map，如果没有，初始化一个
    let depsMap = targetMap.get(target);
    if (depsMap === void 0) {
        targetMap.set(target, (depsMap = new Map()));
    }
    
    // 取出属性对应的依赖集合，如果没有，初始化一个
    let dep = depsMap.get(key);
    if (dep === void 0) {
        depsMap.set(key, (dep = new Set()));
    }

    // 如果该属性还没添加过对应订阅者 effectFn，就添加进去，有更新时会触发回调
    if (!dep.has(effectFn)) {
        dep.add(effectFn);
        effectFn.deps.push(dep); // effectFn也将订阅的属性dep添加进自身的依赖里面
    }
}

function trigger(target, type, key) {
    // 取出对象对应的依赖map，如果没有，返回
    let depsMap = targetMap.get(target);
    if (depsMap === void 0) {
        return;
    }

    // const effects = new Set();
    const dep = depsMap.get(key);
    // 如果属性的订阅者为空，返回
    if (dep === void 0) {
        return;
    }

    dep.forEach((effectFn) => {
        // 如果自定义处理函数，则执行，目前知在computed属性场景有用
        if (effectFn.options.scheduler !== void 0) {
            effectFn.options.scheduler(effect);
        // 否则直接执行
        } else {
            effectFn();
        }
    });
}

window.track = track;
window.trigger = trigger;
window.effect = effect;