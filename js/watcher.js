class Watcher {
  constructor(vm, exp, cb) {
    this.cb = cb;
    this.vm = vm;
    this.getter = (obj) => {
      Dep.target = this;
      exp.split(".").forEach((k) => obj = obj[k]);
      Dep.target = null;
      return obj;
    };
    this.value = this.getter(this.vm);
  }

  update() {
    const newVal = this.getter(this.vm);
    this.cb.call(this.vm, newVal, this.value);
    this.value = newVal;
  }
}
