const Dep = Map;
Dep.target = null;

function observer(data) {
  if (data && typeof data === "object") {
    Object.entries(data).forEach(([key, val]) => {
      const dep = new Dep();
      observer(val);
      Object.defineProperty(data, key, {
        enumerable: true, // 可枚举
        get() {
          dep.set(Dep.target, true); // 添加订阅者
          return val;
        },
        set(newVal) {
          if (newVal !== val) {
            observer(newVal); // 监听新值
            val = newVal;
            for (let watcher of dep.keys()) {
              watcher?.update(); // 通知变化
            }
          }
        },
      });
    });
  }
}
