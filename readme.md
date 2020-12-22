## 剖析Vue实现原理 - 如何实现双向绑定mvvm

> 本文能帮你做什么？<br>
> 1、了解vue的双向数据绑定原理以及核心代码模块<br>
> 2、缓解好奇心的同时了解如何实现双向绑定<br>
> 为了便于说明原理与实现，本文相关代码主要摘自[vue源码](https://github.com/vuejs/vue), 并进行了简化改造，相对较简陋，并未考虑到数组的处理、数据的循环依赖等，也难免存在一些问题，欢迎大家指正。不过这些并不会影响大家的阅读和理解，相信看完本文后对大家在阅读vue源码的时候会更有帮助<br>
> 本文所有相关代码均在github上面可找到 [https://github.com/DMQ/mvvm](https://github.com/DMQ/mvvm)

##### 相信大家对mvvm双向绑定应该都不陌生了，一言不合上代码，下面先看一个本文最终实现的效果吧，和vue一样的语法，如果还不了解双向绑定，猛戳[Google](https://www.google.com.hk/search?q=%E5%8F%8C%E5%90%91%E7%BB%91%E5%AE%9A)

```html
<div id="mvvm-app">
    <input type="text" v-model="word">
    <p>{{word}}</p>
    <button v-on:click="sayHi">change model</button>
</div>

<script src="./mvvm.js"></script>
<script>
var vm = new MVVM({
    el: '#mvvm-app',
        data: {
            word: 'Hello World!'
        },
        methods: {
            sayHi: function() {
                this.word = 'Hi, everybody!';
            }
        }
    });
</script>
```

效果：
![img1][img1]


### 几种实现双向绑定的做法
目前几种主流的mvc(vm)框架都实现了单向数据绑定，而我所理解的双向数据绑定无非就是在单向绑定的基础上给可输入元素（input、textarea等）添加了change(input)事件，来动态修改model和 view，并没有多高深。所以无需太过介怀是实现的单向或双向绑定。

实现数据绑定的做法有大致如下几种：

> 发布者-订阅者模式（backbone.js）

> 脏值检查（angular.js） <br>

> 数据劫持（vue.js）

**发布者-订阅者模式:** 一般通过sub, pub的方式实现数据和视图的绑定监听，更新数据方式通常做法是 `vm.set('property', value)`，这里有篇文章讲的比较详细，有兴趣可点[这里](http://www.html-js.com/article/Study-of-twoway-data-binding-JavaScript-talk-about-JavaScript-every-day)

这种方式现在毕竟太low了，我们更希望通过 `vm.property = value `这种方式更新数据，同时自动更新视图，于是有了下面两种方式

**脏值检查:** angular.js 是通过脏值检测的方式比对数据是否有变更，来决定是否更新视图，最简单的方式就是通过 `setInterval()` 定时轮询检测数据变动，当然Google不会这么low，angular只有在指定的事件触发时进入脏值检测，大致如下：

- DOM事件，譬如用户输入文本，点击按钮等。( ng-click )
- XHR响应事件 ( $http )
- 浏览器Location变更事件 ( $location )
- Timer事件( $timeout , $interval )
- 执行 $digest() 或 $apply()

**数据劫持:** vue.js 则是采用数据劫持结合发布者-订阅者模式的方式，通过`Object.defineProperty()`来劫持各个属性的`setter`，`getter`，在数据变动时发布消息给订阅者，触发相应的监听回调。


### 思路整理
已经了解到vue是通过数据劫持的方式来做数据绑定的，其中最核心的方法便是通过`Object.defineProperty()`来实现对属性的劫持，达到监听数据变动的目的，无疑这个方法是本文中最重要、最基础的内容之一，如果不熟悉defineProperty，猛戳[这里](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)
整理了一下，要实现mvvm的双向绑定，就必须要实现以下几点：
1、实现一个数据监听器Observer，能够对数据对象的所有属性进行监听，如有变动可拿到最新值并通知订阅者
2、实现一个指令解析器Compile，对每个元素节点的指令进行扫描和解析，根据指令模板替换数据，以及绑定相应的更新函数
3、实现一个Watcher，作为连接Observer和Compile的桥梁，能够订阅并收到每个属性变动的通知，执行指令绑定的相应回调函数，从而更新视图
4、mvvm入口函数，整合以上三者

上述流程如图所示：
![img2][img2]

### 1、实现Observer
ok, 思路已经整理完毕，也已经比较明确相关逻辑和模块功能了，let's do it
我们知道可以利用`Obeject.defineProperty()`来监听属性变动
那么将需要observer的数据对象进行递归遍历，包括子属性对象的属性，都加上	`setter`和`getter`
这样的话，给这个对象的某个值赋值，就会触发`setter`，那么就能监听到了数据变化。。相关代码可以是这样：
```javascript
var data = {name: 'kindeng'};
observe(data);
data.name = 'dmq'; // 哈哈哈，监听到值变化了 kindeng --> dmq

function observer(data) {
  Object.entries(data).forEach(([key, val]) => {
    observer(val);
    Object.defineProperty(data, key, {
      enumerable: true, // 可枚举
      get() {
        return val;
      },
      set(newVal) {
        console.log('哈哈哈，监听到值变化了 ', val, ' --> ', newVal);
        val = newVal;
      },
    });
  });
}
```
这样我们已经可以监听每个数据的变化了，那么监听到变化之后就是怎么通知订阅者了，所以接下来我们需要实现一个消息订阅器，很简单，维护一个容器，用来收集订阅者，数据变动触发所有订阅者的update方法，代码改善之后是这样：
```javascript
const Dep = Map;

function observer(data) {
  Object.entries(data).forEach(([key, val]) => {
    const dep = new Dep();
    observer(val);
    Object.defineProperty(data, key, {
      // ... 省略
      set(newVal) {
        if (newVal !== val) {
          console.log('哈哈哈，监听到值变化了 ', val, ' --> ', newVal);
          val = newVal;
          for (let watcher of dep.keys()) {
            watcher?.update(); // 通知变化
          }
        }
      },
    });
  },
}
```
那么问题来了，谁是订阅者？怎么往订阅器添加订阅者？
没错，上面的思路整理中我们已经明确订阅者应该是Watcher, 而且`const dep = new Dep();`是在 `defineReactive`方法内部定义的，所以想通过`dep`添加订阅者，就必须要在闭包内操作，所以我们可以在	`getter`里面动手脚：
```javascript
// ...省略
Object.defineProperty(data, key, {
  get() {
    // 由于需要在闭包内添加watcher，所以通过Dep定义一个全局target属性，暂存watcher, 添加完移除
    dep.set(Dep.target, true);
    return val;
  }
    // ... 省略
});

class Watcher {
  constructor(vm, exp, cb) {
    // ... 省略
    this.getter = (obj) => {
      Dep.target = this;
      // 这里会触发属性的getter，从而添加订阅者
      exp.split(".").forEach((k) => obj = obj[k]);
      Dep.target = null;
      return obj;
    };
    this.value = this.getter(this.vm);
  }
}

```
这里已经实现了一个Observer了，已经具备了监听数据和数据变化通知订阅者的功能，[完整代码](https://github.com/DMQ/mvvm/blob/master/js/observer.js)。那么接下来就是实现Compile了

### 2、实现Compile
compile主要做的事情是解析模板指令，将模板中的变量替换成数据，然后初始化渲染页面视图，并将每个指令对应的节点绑定更新函数，添加监听数据的订阅者，一旦数据有变动，收到通知，更新视图，如图所示：
![img3][img3]

因为遍历解析的过程有多次操作dom节点，为提高性能和效率，会先将vue实例根节点的`el`转换成文档碎片`fragment`进行解析编译操作，解析完成，再将`fragment`添加回原来的真实dom节点中
```javascript
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
}
```

compile方法将遍历所有节点及其子节点，进行扫描解析编译，调用对应的指令渲染函数进行数据渲染，并调用对应的指令更新函数进行绑定，详看代码及注释说明：

```javascript
class Compile {
	// ... 省略
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
  // ... 省略
}

// 指令处理
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

// 事件处理
handle(node, exp, dir) {
  const type = dir.split(":")[1];
  const fn = this.$vm.$options?.methods[exp];
  if (type && fn) {
    node.addEventListener(type, fn.bind(this.$vm), false);
  }
}

// 更新函数
function updater(node, dir, newVal, oldVal) {
  if (dir === "class") {
    return node.classList.replace(oldVal, newVal);
  }
  let key = { text: "textContent", html: "innerHTML", model: "value" }[dir];
  node[key] = typeof newVal === "undefined" ? "" : newVal;
}
```
这里通过递归遍历保证了每个节点及子节点都会解析编译到，包括了{{}}表达式声明的文本节点。指令的声明规定是通过特定前缀的节点属性来标记，如`<span v-text="content" other-attr`中`v-text`便是指令，而`other-attr`不是指令，只是普通的属性。
监听数据、绑定更新函数的处理是在`bind()`这个方法中，通过`new Watcher()`添加回调来接收数据变化的通知

至此，一个简单的Compile就完成了，[完整代码](https://github.com/DMQ/mvvm/blob/master/js/compile.js)。接下来要看看Watcher这个订阅者的具体实现了

### 3、实现Watcher
Watcher订阅者作为Observer和Compile之间通信的桥梁，主要做的事情是:
1、在自身实例化时往属性订阅器(dep)里面添加自己
2、自身必须有一个update()方法
3、待属性变动通知时，能调用自身的update()方法，并触发Compile中绑定的回调，则功成身退。
如果有点乱，可以回顾下前面的[思路整理](#_2)
```javascript
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
```
实例化`Watcher`的时候，调用`get()`方法，通过`Dep.target = this`标记订阅者是当前watcher实例，强行触发属性定义的`getter`方法，`getter`方法执行的时候，就会在属性的订阅器`dep`添加当前watcher实例，从而在属性值有变化的时候，watcherInstance就能收到更新通知。

ok, Watcher也已经实现了，[完整代码](https://github.com/DMQ/mvvm/blob/master/js/watcher.js)。
基本上vue中数据绑定相关比较核心的几个模块也是这几个，猛戳[这里](https://github.com/vuejs/vue) , 在`src` 目录可找到vue源码。

最后来讲讲MVVM入口文件的相关逻辑和实现吧，相对就比较简单了~

### 4、实现MVVM
MVVM作为数据绑定的入口，整合Observer、Compile和Watcher三者，通过Observer来监听自己的model数据变化，通过Compile来解析编译模板指令，最终利用Watcher搭起Observer和Compile之间的通信桥梁，达到数据变化 -> 视图更新；视图交互变化(input) -> 数据model变更的双向绑定效果。

一个简单的MVVM构造器是这样子：
```javascript
class MVVM {
  constructor(options = {}) {
    this.$options = options;
    this._data = this.$options.data || {};
    observer(this._data); // 劫持监听所有数据属性
    this.$compile = new Compile(options.el, this); // 解析指令
  }
  // ... 省略
}
```

但是这里有个问题，从代码中可看出监听的数据对象是options.data，每次需要更新视图，则必须通过`var vm = new MVVM({data:{name: 'kindeng'}}); vm._data.name = 'dmq'; `这样的方式来改变数据。

显然不符合我们一开始的期望，我们所期望的调用方式应该是这样的：
`var vm = new MVVM({data: {name: 'kindeng'}}); vm.name = 'dmq';`

所以这里需要给MVVM实例添加一个属性代理的方法，使访问vm的属性代理为访问vm._data的属性，改造后的代码如下：

```javascript
class MVVM {
  constructor(options = {}) {
    this.$options = options;
    this._data = this.$options.data || {};
    this._proxyData(); // 数据代理,实现 vm.xxx -> vm._data.xxx
    observer(this._data); // 劫持监听所有数据属性
    this.$compile = new Compile(options.el, this); // 解析指令
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
  // ... 省略
}

```
这里主要还是利用了`Object.defineProperty()`这个方法来劫持了vm实例对象的属性的读写权，使读写vm实例的属性转成读写了`vm._data`的属性值，达到鱼目混珠的效果，哈哈

至此，全部模块和功能已经完成了，如本文开头所承诺的两点。一个简单的MVVM模块已经实现，其思想和原理大部分来自经过简化改造的vue[源码](https://github.com/vuejs/vue)，猛戳[这里](https://github.com/DMQ/mvvm)可以看到本文的所有相关代码。
由于本文内容偏实践，所以代码量较多，且不宜列出大篇幅代码，所以建议想深入了解的童鞋可以再次结合本文源代码来进行阅读，这样会更加容易理解和掌握。

### 总结
本文主要围绕“几种实现双向绑定的做法”、“实现Observer”、“实现Compile”、“实现Watcher”、“实现MVVM”这几个模块来阐述了双向绑定的原理和实现。并根据思路流程渐进梳理讲解了一些细节思路和比较关键的内容点，以及通过展示部分关键代码讲述了怎样一步步实现一个双向绑定MVVM。文中肯定会有一些不够严谨的思考和错误，欢迎大家指正，有兴趣欢迎一起探讨和改进~

最后，感谢您的阅读！

[img1]: ./img/1.gif
[img2]: ./img/2.png
[img3]: ./img/3.png
