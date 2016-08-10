## 透过Vue, 如何实现一个简单的mvvm双向数据绑定

> 本文主要是在分析Vue源码的基础上，对其相关核心思想和逻辑进行简化，并通过实现一个简单的实现来阐述相关原理和思想，文中并不会涉及太多源码片段的解析，但其核心思想都会在文中表现出来，对阅读Vue源码会有更好的帮助，相信会让你的思路更加清晰~

#### 1、一个简单的Vue例子：[Hello World!](./vue-demo/index.html)
**code:** 
```
<div id="vue-app">
	<input type="text" v-model="word">
	<p>{{word}}</p>
	<button v-on:click="sayHi">change model</button>
</div>

<script src="http://cdn.bootcss.com/vue/1.0.25/vue.js"></script>
<script>
	var vm = new Vue({
		el: '#vue-app',
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

#### 2、如题，今天要跟大家分享的就是实现上面的功能，是这样子的：[My mvvm](./mvvm.html)
**code:**
```
<div id="mvvm-app">
	<input type="text" v-model="name">
	<input type="text" v-model="child.name">
	<p v-class="className" class="abc">
		{{child.child.name}}
	</p>
	<span v-text="child.name"></span>
	<p v-html="child.html"></p>
	<button v-on:click="clickBtn">change model</button>
</div>

<script src="./js/observer.js"></script>
<script src="./js/watcher.js"></script>
<script src="./js/compile.js"></script>
<script src="./js/mvvm.js"></script>
<script>
	var vm = new MVVM({
		el: '#mvvm-app',
		data: {
			name: 'hello ',
			className: 'btn',
			spanText: 'hello world!',
			child: {
				name: '孩子名字',
				html: '<span style="color: #f00;">red</span>',
				child: {
					name: '孩子的孩子名字 '
				}
			}
		},

		methods: {
			clickBtn: function(e) {
				var randomStrArr = ['childOne', 'childTwo', 'childThree'];
				this.child.name = randomStrArr[parseInt(Math.random() * 3)];
			}
		}
	});
</script>
```

#### 3、目前实现数据绑定的几种做法


> 观察者模式（backbone.js）
> 
> 脏值检查（angular.js） 
> 
> 数据劫持（vue.js） 

观察者模式一般通过sub, pub的方式实现数据和视图的绑定监听，更新数据方式通常 `vm.set('property', value)`, 这种方式现在毕竟太low了，我们更希望通过 `vm.property = value `这种方式更新数据，同时自动更新视图。

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

