class Compile {
  constructor(el = document.body, vm) {
    this.$vm = vm;
    this.$el = el.nodeType === 1 ? el : document.querySelector(el);
    if (this.$el) {
      this.$fragment = document.createDocumentFragment();
      let child;
      while ((child = this.$el.firstChild)) {
        this.$fragment.appendChild(child);
      }
      this.compile(this.$fragment);
      this.$el.appendChild(this.$fragment);
    }
  }

  compile(el) {
    el.childNodes?.forEach((node) => {
      if (node.nodeType === 1) {
        Array.from(node.attributes)
          .filter(({ name }) => name.startsWith("v-"))
          .forEach(({ name, value }) => {
            const dir = name.substring(2);
            if (dir.startsWith("on")) {
              this.handle(node, value, dir); // 事件指令
            } else if (["text", "html", "class", "model"].includes(dir)) {
              this.bind(node, value, dir); // 普通指令
            }
            node.removeAttribute(name);
          });
      } else if (node.nodeType === 3 && /\{\{(.*)\}\}/.test(node.textContent)) {
        this.bind(node, RegExp.$1.trim(), "text");
      }
      this.compile(node);
    });
  }

  bind(node, exp, dir) {
    let val = this._getVMVal(exp);
    updater(node, dir, val); // 初始化视图
    new Watcher(this.$vm, exp, (newVal, oldVal) =>
      updater(node, dir, newVal, oldVal)
    ); // 更新视图
    if (dir === "model") {
      node.addEventListener("input", ({ target: { value: newValue } }) => {
        if (val !== newValue) {
          this._setVMVal(exp, newValue);
          val = newValue;
        }
      });
    }
  }

  handle(node, exp, dir) {
    const type = dir.split(":")[1];
    const fn = this.$vm.$options?.methods[exp];
    if (type && fn) {
      node.addEventListener(type, fn.bind(this.$vm), false);
    }
  }

  _getVMVal(exp) {
    let val = this.$vm;
    exp.split(".").forEach((k) => (val = val[k]));
    return val;
  }

  _setVMVal(exp, value) {
    let val = this.$vm;
    exp = exp.split(".");
    exp.forEach((k, i) => {
      if (i < exp.length - 1) {
        val = val[k];
      } else {
        val[k] = value; // 更新非最后一个key的值
      }
    });
  }
}

function updater(node, dir, newVal, oldVal) {
  if (dir === "class") {
    return node.classList.replace(oldVal, newVal);
  }
  let key = { text: "textContent", html: "innerHTML", model: "value" }[dir];
  node[key] = typeof newVal === "undefined" ? "" : newVal;
}
