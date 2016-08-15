## 剖析Vue实现原理 - 如何实现双向绑定mvvm

> 本文能帮你做什么？
> 1、了解vue的双向数据绑定原理以及核心代码模块
> 2、缓解好奇心的同时了解如何实现双向绑定
> 为了便于说明原理与实现，本文相关代码主要摘自[vue源码](https://github.com/vuejs/vue), 并进行了简化改造，相对较简陋，并未考虑到数组的处理、数据的循环依赖等，也难免存在一些问题，欢迎大家指正。不过这些并不会影响大家的阅读和理解，相信看完本文后对大家在阅读vue源码的时候会更有帮助
> 本文所有相关代码均在github上面可找到 [https://github.com/DMQ/mvvm](https://github.com/DMQ/mvvm)

##### 相信大家对mvvm双向绑定应该都不陌生了，一言不合上代码（可怜的代码），下面先看一个本文最终实现的效果吧，和vue一样的语法，如果还不了解双向绑定，猛戳[这里]()

```
<div id="mvvm-app">
	<input type="text" v-model="word">
	<p>{{word}}</p>
	<button v-on:click="sayHi">change model</button>
</div>

<script src="./js/observer.js"></script>
<script src="./js/watcher.js"></script>
<script src="./js/compile.js"></script>
<script src="./js/mvvm.js"></script>
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
![demo1][demo1]


### 几种实现双向绑定的做法
目前几种主流的mvc(vm)框架都实现了单向数据绑定，而我所理解的双向数据绑定无非就是在单向绑定的基础上给可输入元素（input、textare等）添加了change(input)事件，来动态修改model和 view，并没有多高深。所以无需太过介怀是实现的单向或双向绑定。

实现数据绑定的做法有大致如下几种：

> 发布者-订阅者模式（backbone.js）

> 脏值检查（angular.js） 

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
2、实现一个指令解析器Compile，对每个元素节点的指令进行扫描和解析，根据指令替换数据，以及绑定相应的更新函数
3、实现一个Watcher，作为连接Observer和Compile的桥梁，能够订阅并收到每个属性变动的通知，执行指令绑定的相应回调函数，从而更新视图
4、mvvm入口函数，整合以上三者

上述流程如图所示：


### 1、实现Observer
ok, 思路已经整理完毕，也已经比较明确相关逻辑和模块功能了，let's do it
我们知道可以利用`Obeject.defineProperty()`来监听属性变动
那么将需要observe的数据对象进行递归遍历，包括子属性的属性，都加上	`set`和`get`
这样的话，给这个对象的某个值赋值，就会触发`set`，那么就能监听到了数据变化。。相关代码可以是这样：
```
var data = {name: 'kindeng'};
observe(data);
data.name = 'dmq'; // 哈哈哈，监听到值变化了 kindeng --> dmq

function observe(value, vm) {
    if (!value || typeof value !== 'object') {
        return;
    }

    Object.keys(data).forEach(function(key) {
	    defineReactive(data, key, data[key]);
	});
};

function defineReactive(data, key, val) {
    observe(val); // 监听子属性

    Object.defineProperty(data, key, {
        enumerable: true, // 可枚举
        configurable: false, // 不能再define
        get: function() {
            return val;
        },
        set: function(newVal) {
            console.log('哈哈哈，监听到值变化了 ', val, ' --> ', newVal);
            val = newVal;
        }
    });
}

```
这样我们已经可以监听每个数据的变化了，那么监听到变化之后就是怎么通知订阅者了，所以接下来我们需要实现一个消息订阅器，很简单，维护一个数组，用来收集订阅者，数据变动触发notify，再调用订阅者的update方法，代码改一下之后是这样：
```
// ... 省略
function defineReactive(data, key, val) {
	var dep = new Dep();
    observe(val); // 监听子属性

    Object.defineProperty(data, key, {
        enumerable: true, // 可枚举
        configurable: false, // 不能再define
        get: function() {
        	return val;
        },
        set: function(newVal) {
        	if (val === newVal) return;
            console.log('哈哈哈，监听到值变化了 ', val, ' --> ', newVal);
            val = newVal;
            dep.notify(); // 通知所有订阅者
        }
    });
}

function Dep() {
    this.subs = [];
}
Dep.prototype = {
    addSub: function(sub) {
        this.subs.push(sub);
    },
    notify: function() {
        this.subs.forEach(function(sub) {
            sub.update();
        });
    }
};
```
那么问题来了，谁是订阅者？没错，上面的思路整理中我们已经知道订阅者应该是Watcher, 而且`var dep = new Dep();`是在 defineReactive 方法内部定义的，所以想通过dep添加订阅者，就必须要在闭包内操作，所以我们可以在	`get`里面动手脚，
```
// ...省略
get: function() {
	dep.addDep(new Watcher()); // 这里只是举例，肯定不能这么粗暴，每个watcher都是不一样的，后面讲到
	return val
}
// ...省略
```
先记住这个思路，待会再具体实现。什么？记不住？后面再讲一遍吧

这里已经实现了一个Observer了，已经具备了应有的功能，vue源码在[这里](https://github.com/vuejs/vue/blob/dev/src/observer/index.js)。那么接下来就是实现Compile了

### 2、实现Watcher
从前面知道，`var dep = new Dep();`是在 defineReactive 方法内部定义的，所以想通过dep添加订阅者，就必须要在闭包内操作，所以我们可以在	`get`里面动手脚
```
// ... 省略
var dep = new Dep();
Object.defineProperty(data, key, {
    enumerable: true, // 可枚举
    configurable: false, // 不能再define
    get: function() {
		dep.add
    	return val;
    },
    set: function(newVal) {
    	if (val === newVal) return;
        console.log('哈哈哈，监听到值变化了 ', val, ' --> ', newVal);
        val = newVal;
        dep.notify(); // 通知所有订阅者
    }
});

```

#### 4、Vue的生命周期 ([Github](https://github.com/vuejs/vue/))

<img src="https://vuejs.org.cn/images/lifecycle.png" width="640px">


#### 5、我们要实现的关键点：

- 数据监听 Observer.js 和消息订阅器 Dep.js
- 订阅者 Watcher.js
- 指令编译器 Compile.js
- 入口 mvvm

#### 6、一切基于此Object.defineProperty()  
*IE8+*

**code:**
```
function defineReative(data) {
	var val;
	Object.defineProperty(data, 'name', {
		enumerable: true,	// 可枚举
		configurable: true,	// 不能再define
		get: function() {
			return val;
		},
		set: function(newVal) {
			console.log('你变了：', val, ' ==> ', newVal);
			val = newVal;
		}
	});
}

var data = {};
defineReative(data);
```


#### 7、实现Observer.js

负责监听源数据所有属性，一旦发生变化，通知订阅者更新视图

[code](./js/observer.js)


#### 8、实现Compile.js

负责解析模板指令，不同的指令绑定不同的处理回调及视图更新方法

[code](./js/compile.js)

#### 9、如何连接observe 和 compile --> watcher.js（桥梁）

充当数据更新的订阅者，每一个属性的变化都会通知它，在compile阶段实例化并注入回调函数

每一个属性都有一个watcher

[code](./js/watcher.js)

[demo1]: ./img/1.gif
[demo2]: ./img/2.jpg
