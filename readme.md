## 剖析Vue实现原理 - 如何实现双向绑定mvvm

> 本文能帮你做什么？
> 1、了解vue的双向数据绑定原理以及核心代码模块
> 2、缓解好奇心的同时了解如何实现双向绑定
> 为了便于说明原理与实现，本文相关代码主要摘自[vue源码](https://github.com/vuejs/vue), 并进行了简化改造，相对较简陋，并未考虑到数组的处理、数据的循环依赖等，也难免存在一些问题，欢迎大家指正。不过这些并不会影响大家的阅读和理解，相信对大家在阅读vue源码的时候会更有帮助
> 本文所有相关代码均在github上面可找到 [https://github.com/DMQ/mvvm](https://github.com/DMQ/mvvm)

##### 相信大家对mvvm双向绑定应该都不陌生了，一言不合就上代码，下面先看一个本文最终实现的效果吧，和vue一样的语法，如果还不了解双向绑定，请看[这里]()

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


#### 几种实现双向绑定的做法
目前几种主流的mvc(vm)框架都实现了数据绑定，而我所理解的双向数据绑定无非就是在单向绑定的基础上给可输入元素（input、textare等）添加了change(input)事件，来动态修改model --> view，其实并没有多高深。所以无需太过介怀单向或双向绑定。

实现数据绑定的做法有大致如下几种：

> 发布者-订阅者模式（backbone.js）
> 
> 脏值检查（angular.js） 
> 
> 数据劫持（vue.js，ember.js） 

**发布者-订阅者模式:** 一般通过sub, pub的方式实现数据和视图的绑定监听，更新数据方式通常做法是 `vm.set('property', value)`，这里有篇文章讲的比较详细，有兴趣可点[这里](http://www.html-js.com/article/Study-of-twoway-data-binding-JavaScript-talk-about-JavaScript-every-day)


这种方式现在毕竟太low了，我们更希望通过 `vm.property = value `这种方式更新数据，同时自动更新视图。

angular.js 是通过脏值检测的方式比对数据是否有变更，来决定是否更新视图，最简单的方式就是通过 `setInterval()` 定时轮询检测数据变动，当然Google不会这么low，angular只有在指定的事件触发时进入脏值检测，大致如下：

- DOM事件，譬如用户输入文本，点击按钮等。( ng-click ) 
- XHR响应事件 ( $http ) 
- 浏览器Location变更事件 ( $location ) 
- Timer事件( $timeout , $interval ) 
- 执行 $digest() 或 $apply()

** vue.js 则是数据劫持结合观察者模式，通过`Object.defineProperty()`来劫持各个属性的`setter`，`getter`，在数据变动时发布消息给订阅者，触发相应的监听回调。**


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
