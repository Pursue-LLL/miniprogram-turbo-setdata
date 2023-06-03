
# miniprogram-turbo-setdata

`miniprogram-turbo-setdata` 是一个小程序 `setData` 增强库，该库顾名思义，用来增强原生`setData`能力，大幅提高 `setData` 的性能，该工具对照官方优化建议文档，尽可能地自动实现 `setData` 优化，让你放心地使用 `setData` ，开发中只需关注业务逻辑，提高开发效率和开发体验的同时也能大幅提高性能。

具体支持特性如下：

* 合并 `setData`
* 去重 `setData`
* 监听 `setData`
* 输出 `setData` 调用日志

## 使用

``` bash
npm install miniprogram-turbo-setdata
```

工具支持按需引入，可以全局使用，也可以在某个页面或组件中单独使用

``` js
// app.js 全局引入，会增强所有页面
import { useTurboAllPage } from 'miniprogram-turbo-setdata';

useTurboAllPage();
```

``` js
// app.js 全局引入，会增强所有组件
import { useTurboAllComponent } from 'miniprogram-turbo-setdata';

useTurboAllComponent();
```

``` js
// 单个页面使用，只需一行导入即可生效
import { Page } from 'miniprogram-turbo-setdata';

Page({
 data: {},
 ...
})
```

``` js
// 单个组件使用，只需一行导入即可生效
import { Component } from 'miniprogram-turbo-setdata';

Component({
 data: {},
 ...
})
```

> 已经全局应用后，无需再单独引入。

## 特性

### 合并 setData

自动合并同一时间片的被更新数据，工具将缓冲它们到下一个时机统一执行更新操作。该功能针对官方优化建议中的第二条：**减少setData频率**。

例如：

``` js
// 处理前
this.setData({obj: {a: 3}});
this.setData({arr: []});
this.setData({obj1: {a: 3}});
this.setData({obj2: {a: 3}});
this.setData({obj3: {a: 3}});
// 5次连续的setData正常情况下，会触发5次与渲染层的通讯，性能严重浪费

// 处理后
this.setData({obj: {a: 4}, arr: [], ..., obj3: {a: 3}});
// 使用工具后，工具会自动将数据合并，只执行一次setData，大大减少通信消耗，提高响应速度

```

回调函数也会正常触发

``` js
// 处理前

this.setData({obj2: {a: 3}}, ()=>{});
this.setData({obj3: {a: 3}}, ()=>{});
// 5次连续的setData正常情况下，会触发5次与渲染层的通讯，性能严重浪费

// 处理后
this.setData({obj: {a: 4}, arr: [], ..., obj3: {a: 3}}, ()=>{
 // 遍历执行所有回调函数
});
// 使用工具后，工具会自动将数据合并，只执行一次setData，大大减少通信消耗，提高响应速度

```

同一时间片的相同 setData 只会生效最后一个

``` js
// 处理前

this.setData({obj: {a: 3}}, ()=>{}); // 该 setData 不会与渲染层交互，但会执行回调
this.setData({obj: {a: 3}}, ()=>{}); // 该 setData 后生效

// 处理后
this.setData({obj: {a: 3}}, ()=>{
 // 遍历执行所有回调函数，即使 setData 的数据相同，回调函数也会依次执行，但是数据更新只执行一次
});
// 使用工具后，工具会自动将数据合并，只执行一次setData，大大减少通信消耗，提高响应速度

```

存在异步任务的情况

``` js
// 处理前
this.setData({obj: {a: 3}});
this.setData({arr: []});
this.setData({obj1: {a: 3}});
this.setData({obj2: {a: 3}});
this.setData({obj3: {a: 3}});
// 宏任务在下一轮事件循环开始时执行
setTimeout(()=>{
 this.setData({obj4: {a: 3}});
}, 1000);

// 微任务在本轮循环结束前执行，即宏任务执行完立刻执行微任务，微任务属于本轮事件循环
new Promise((resolve) => {
      resolve();
   }).then((res) => {
      this.setData({ obj6: { a: 3 } });
   });
Promise.resolve().then(() => {
  this.setData({ obj5: { a: 3 } });
});

// 小程序中的nextTick属于宏任务，在下个事件循环开始时执行，类似于setTimeout，但是它的执行时机永远早于setTimeout
wx.nextTick(() => {
   this.setData({ obj7: { a: 3 } });
});
wx.nextTick(() => {
   this.setData({ obj8: { a: 3 } });
});


// 处理后
this.setData({obj: {a: 4}, arr: [], ..., obj3: {a: 3}, obj5:{a: 3}, obj6: {a: 3}});
this.setData({ obj7: { a: 3 }, obj8: {a: 3} });
this.setData({obj4: {a: 3}});

// 异步任务被放入下一时间片处理，以上那么多个setData最终被合并为3个。

```

### 去重 setData

将即将被更新的数据与现存数据进行对比，忽略重复数据，达到只更新发生变化的数据的效果。

例如：

``` js
Page({
      data: {
        obj: {a: 3, b: 6},
        open: true,
      },
      onLoad(){
       this.setData({ open: true }); // 该 setData 不会被触发
       this.setData({ 'obj.a': 3 }); // 该 setData 不会被触发
       this.setData({ obj: {a: 3, b: 5} }); // 只更新 this.setData({'obj.b': 5})，自动更改为数据路径形式
       this.setData({ 'obj.b': 5 }); // 已经被改为 5 了，该 setData 不会被触发
      }
    })
```

深层级的对象或数组也支持 `diff`，都会在内部被改成数据路径形式，例如`this.setData({'obj.a.b.c': {a: 3}})`，开发者对此是无感知的，正常写逻辑代码就好。

## 监听 setData

可以使用 watch 字段对数据变化进行监听：

``` js
Page({
    watch: {
      arr(newVal, oldval) { // 监听数组字段

      },

      'filter.expanding'(newVal, oldval) { // 监听对象子属性，兄弟属性变化不触发

      },

      'entries[1].key'(newVal, oldval) { // 监听数组对象子属性

      },

      obj(newVal, oldval) { // 监听对象，子属性变化也会触发

      },
    },
})

```

**只有变化的数据才会触发监听回调**。

**特别注意：**

小程序官方对于 setData 的限制是只能传入可 JSON 化的数据，如 `Map`、`Set`、正则、`Date` 等会被转为 `{}`，空对象，不要监听这些数据。

异常类型示例：

``` js

const obj = {
    nan: NaN,
    infinityMax: 1.7976931348623157E+10308,
    infinityMin: -1.7976931348623157E+10308,
    undef: undefined,
    fun: () => 'func',
    date: new Date(),
    map: new Map(),
    set: new Set(),
    reg: /\w+/,
  },

小程序处理后的数据：

1. date: {}
2. fun: ƒ fun() // 函数可以正常传递，从基础库 2.0.9 开始，对象类型的属性和 data 字段中可以包含函数类型的子字段，即可以通过对象类型的属性字段来传递函数。
3. infinityMax: Infinity
4. infinityMin: -Infinity
5. map: {}
6. nan: NaN
7. reg: {}
8. set: {}
9. undef: undefined

而 JSON.stringfy 之后的结果：

nan: NaN, // NaN拷贝后变成null
infinityMax: 1.7976931348623157E+10308,  // 浮点数的最大值拷贝后变成null
infinityMin: -1.7976931348623157E+10308, // 浮点数的最小值拷贝后变成null
undef: undefined, // 拷贝后直接丢失
fun: () => 'func', // 拷贝后直接丢失
date: new Date(), // 时间类型拷贝后会被变成字符串类型数据
map: new Map(), // {}
set: new Set(), // {}
reg: /\w+/, // {}

```

所以小程序内的数据转化还不完全是依赖 `JSON.stringfy`，还有额外的判断和处理，例如要做函数支持等，应该是先对数据进行处理再 `stringfy` 然后传给渲染层，这也恰好说明了 `setData` 一次性能消耗过大的原因。

## setData 选项

**SetDataOptions**

|参数 |说明 |类型 |默认值
|:--|:--|:--:|:--:|
|`useNative` |是否使用原生setData方法 |  boolean | false |
|`useOldValue` |是否在数据长度变化时复用旧值 |boolean | false|
|`useSyncData` |是否需要在setData后同步获取新值 |boolean |false |

**使用：**

``` js
// useNative

this.setData({obj: {a: 3}}, null, {useNative: true});

 // 工具已经足够健壮，但是任何情况你不想使用优化 setData 了（遇到了一些极端情况），仍提供可以调用原生 setData 方法的选择
```

``` js
// useOldValue

const list = [...]; // length: 10
const newList = [...].concat(list); // length: 20
this.setData({list: newList}, null, {useOldValue: true});

 // 默认情况下当数据长度变化时不再 diff 子属性，而是直接更新 newList 的所有数据（20 条），开启useOldValue后，会复用旧值，前 10 个已经渲染过，本次更新将只更新新添加的后 10 个
```

``` js
// useSyncData

this.setData({obj: {a: 6}}, null, {useSyncData: true});
console.log(this.data.obj); // {a: 6}，可以立即获取到新值

 // 在setData后同步获取新值，默认禁用，原生是可以在 setData 后 通过 this.data 获取到新值的，但是一般情况用不到，对于有大量数据路径形式更新值的页面禁用会节省一些性能消耗，使 turbo setdata 工具发挥极致作用
```

你还可以在 setData 的回调中获取新值，或者像 `Vue` 一样，在 `nextTick` 中获取新值。

例如：

``` js
this.setData({obj: {a: 6}}, null, {useSyncData: true});
// 使用下面两种方式也可以
this.setData({ 'obj.b.c': 8 });
wx.nextTick(() => {
  console.log(this.data.obj.b.c); // 8
});
```

如果你想兼容旧项目或页面，想拿来即用并不想做任何修改，也有全局选项可以提供设置，后面详细说明。
> 但是还是推荐不要开启全局同步更新，人工查找一下页面内通过 `this.data` 方式同步获取值的代码也非常容易。

**为什么默认禁用同步更新逻辑层 data 的功能？**

1. **为了工具有更强的表现**，实际上这部分做了一个解析数据路径并遍历赋值的操作，但是其实倒也不复杂，仅可能会对使用较多数据路径更新值的页面或组件有较大影响。

2. **同步使用 this.data 获取值并不常用**（如果你的 data 都是仅与渲染层相关的数据，而不是把其他数据也挂在 this.data 上，这里不理解的同学可以看我的另一篇关于 setData 的文章），工具自动更新了但是开发者没有使用，性能就浪费了，所以由开发者根据需求自由开启。

### 工具选项

**TurboOptions**

|参数 |说明 |类型 |默认值
|:--|:--|:--:|:--:|
|`useSyncData` |是否需要在 setData 后同步获取新值（全局生效） |  boolean | false |
|`logNative` |是否输出原生表现日志 |  boolean | false |
|`logTimeConsuming` |是否输出优化后的 setData 耗时和次数 |boolean | false|
|`logUpdatedData` |是否输出每次 setData 被更新的数据(合并且 diff 后的) |boolean |false |
|`logDuplicateData` |是否输出查找到的重复数据 |boolean |false |

使用：

``` js
// 在 Page 或 Component 构造器的第二个参数中填写以下选项
Page(
    {
            data: {},
            methods: {},
            ...
    },
    {
      turboOptions: {
        useSyncData: true, // 是否需要在 setData 后同步获取新值（全局配置）
        logNative: true,  // 是否输出原生表现日志，开启后会使用原生 setData 并输出耗时和次数，可用于对比优化效果
        logTimeConsuming:  true, // 是否输出优化后的 setData 耗时和次数
        logUpdatedData: true, // 是否输出本次 setData 被更新的数据(合并且 diff 后的)
        logDuplicateData: true, // 是否输出被筛选出的重复数据
      }
    }
)
```

以上日志输出功能对帮助开发者自查和自优化有很大作用。

## miniprogram-turbo-setdata 优势

#### 1. 高性能

工具遵循性能优先原则，实现的代码优先考虑时间复杂度以及执行效率，开发过程中反复对比测试不同写法的耗时，力求既快又强。

> 因库的性能优先性质，所以很多写法都与正常业务代码不一样，对源码感兴趣的同学学习过程中请注意这点。

#### 2. 非侵入性、稳定

遵循面向切面开发思想，在小程序原有功能基础上进行扩展，所有功能的实现无任何破坏性，无论是引入使用方式和工具选项的传参方式都极具兼容性，不使用时去掉引用即可，代码无需任何更改，小程序照跑不误。工具经过长期测试才放出稳定版本。

#### 3. 灵活、简单

工具支持按需引入，可以全局使用，也可以在某个页面或组件中单独使用，给你足够灵活的选择空间，无论是新项目还是旧项目引入形式任意选，简单到不能再简单~

``` js
// app.js 全局引入，会增强所有页面
import { useTurboAllPage } from 'miniprogram-turbo-setdata';
useTurboAllPage();
```

``` js
// app.js 全局引入，会增强所有组件
import { useTurboAllComponent } from 'miniprogram-turbo-setdata';
useTurboAllComponent();
```

``` js
// 单个页面使用，只需一行导入即可生效
import { Page } from 'miniprogram-turbo-setdata';
Page({
 data: {},
 ...
})
```

``` js
// 单个组件使用，只需一行导入即可生效
import { Component } from 'miniprogram-turbo-setdata';
Component({
 data: {},
 ...
})
```

> miniprogram-turbo-setdata 更擅长优化数据复杂、setData 次数较多的页面，对于较简单的页面，setData 次数也就一两次，工具可能起到的作用很有限。

> 也可仅用于开发阶段的 setData 分析和自查，在不是很复杂的页面，你也可以使用工具分析之后自己手动优化。

目前看来，该工具已经可以实现让开发者更专注于业务逻辑，不用额外花精力去思考如何减少 `setData`、如何只更新变化数据，从而**提高开发效率和开发体验**了，那说了这么多，它的实际效果怎么样呢？

## 效果分析

以一个 百万 `DAU` 小程序的较为复杂的列表页为例，从进入页面到加载完成：

**使用低性能机型测试 5 次平均耗时为：**

原生 setData：setData 次数 `41`次，耗时： `5100ms`；

turbo setData：setData 次数 `19` 次，耗时： `2400ms`；

##### 使用高性能机型原生测试 5 次平均耗时为

原生 setData：setData 次数 `41` 次，耗时： `3900ms`；

turbo setData:  setData 次数 `19` 次，耗时： `1800ms`；

以上结果只是测量页面内调用 `setData` 的耗时，不包含网络请求等其他耗时，可以看出，不考虑页面的网络请求和其他逻辑代码的执行效率的话，优化之后是可以提升**一倍以上**渲染性能的，这是人工优化极难做到的，因为我们要兼顾对复杂页面代码可读性、可维护性的考虑。

优化能够提升的性能与页面的数据组织方式、写法等都有很大关系，例如你同样更新一个数组，连续更新了 3 次，那工具就会帮你把后面的 2 次过滤掉，只 setData 一次，那么理论上你就能获得 2 倍的性能提升，当然只是举例，绝对不推荐这么做。

当页面足够复杂时，开发中有很多 `setData` 都是隐性的（尤其你在代码中直接 `setData` 了一个对象，或者使用了扩展运算符），有时候自己都很难搞清楚哪些数据在哪里被 `setData` 了，这就是工具的价值所在，帮你找到那些 `setData`，并优化它。

## 更佳实践

##### 1. 避免通过 `this.data.xxx` 的形式去更改数据值，包括 this.data.xxx 指向的引用类型

例如下面这种情况，更新一个字段值为引用类型时，可能会造成数据不准确：

``` js
this.viewModal = {obj: {a: 3}};
this.setData({obj: this.viewModal.obj}); // 此时逻辑层的data.obj已经指向viewModal.obj对象的地址

viewModal.obj.a = 666; // 操作了 viewModal 对象
this.data.obj.a === 666; // true，预期的 a 应该是 3，但是却变成 6 了
// 之后无论你在任何地方不小心更改了viewModal.obj，那么this.data.obj也变了，而此时在渲染层的数据还是旧数据，你本意是想通过this.data获取当前被渲染的值，但是这时候可能值已经并不符合你的预期了。
```

data 理应就是渲染层的数据，由于框架的特殊原因，不得不在渲染层和逻辑层通讯才维护了两份数据，**逻辑层的 data 应始终是渲染层 data 的影子，时时刻刻保持绝对一致**，应该仅通过 setData 的形式对 data 进行更新，这样能避免很多奇怪问题和 Bug，既安全也更利于维护，所以避免通过 `this.data.xxx` 的形式去更改数据值，包括 `this.data.xxx` 指向的引用类型。

> 不安全不说，另外维护一份数据，类似上面 `viewModal` 这种，还会分散你的精力。

实际上这种写法对工具也会有一个较大的影响：

``` js
this.viewModal = {obj: {a: 3}};
this.viewModal.obj.a === 666;
this.setData({obj: this.viewModal.obj}); // 此时逻辑层的data.obj已经指向viewModal.obj对象的地址
```

执行 setData 时工具内部会对比旧数据（`this.data`）和新数据，上面的写法在 setData 之前旧数据就已经变成新数据了，即旧数据是 `{obj: {a: 6}}`，新数据也是 `{obj: {a: 6}}`，那 diff 的结果就是没有发现变化，从而不触发 setData，显然工具如果直接忽略这次的 setData 那就会造成大 Bug，所以遇到这种情况内部会直接调用原生 setData，那么工具实际上就发挥不了任何优化作用了。

所以，不随意操作 `this.data` 以及其指向的引用对象是一个对大家都好的习惯。

> 工具会对这种情况的代码信息 warn 到控制台，使你能够迅速定位是哪里的 setData 更新了值为引用类型。

> 如果你依旧要通过非 setData 的形式去改变 this.data:
>
> 当你明确知道某处 setData 使用了引用类型，并且在 setData 之前已经被更改了，
那可以直接使用 useNative 选项，工具就不会做多余的 `diff` 而是直接走原生方法，如：

``` js
this.setData({obj: this.viewModal.obj}, null, {useNative: true})
```

当然不改动也完全没问题，内部也做好了兼容，使用 `useNative` 的好处是让工具直接忽略掉， **不会再做多余的 diff 操作**。

#### 2. 使用 setData 同步维护渲染层的数据状态

例如，这种场景：

一个 Dialog 组件，由 `show` 属性控制展示隐藏，但是组件内部也提供了方法来关闭弹窗，即组件内部自己更改了它的 `show` 属性，如下，当你使用 `showDialog：true` 打开对话框后，操作按钮关闭了对话框，但此时页面的 `showDialog` 字段值还是 `true`，当你再次 调用 `setData({showDialog: true})` 的时候，工具会判定属性未发生改变此次 `setData` 并不会生效，所以记得**同步维护渲染层的数据状态**，在 onClose 回调中更新一下 `setData({showDialog: false})`。

``` html
<dialog show="{{showDialog}}" bind:onclose="onClose"></dialog>
```

#### 3. 遇到问题善用日志选项排查，它能帮你定位 90% 的问题

例如上例，当你使用日志选项中的 logDuplicateData 时，便会立即发现 setData({showDialog: true}) 重复了，所以本次 setData 没有生效。

``` js
  turboOptions: {
    useSyncData: true, // 是否需要在 setData 后同步获取新值（全局配置）
    // logNative: true,  // 是否输出原生表现日志，开启后会使用原生 setData 并输出耗时和次数，可用于对比优化效果
    logTimeConsuming:  true, // 是否输出优化后的 setData 耗时和次数
    logUpdatedData: true, // 是否输出本次 setData 被更新的数据(合并且 diff 后的)
    logDuplicateData: true, // 是否输出被筛选出的重复数据
  }
```

即使在排查日志后也解决不了问题，也有终极方案: `useNative` 选项，该选项会使用原生 setData，最后如果你觉得你遇到的问题是一个 bug，别忘了提 issue 给我。

``` js
this.setData({}, null, {useNative: true})
```

> 更多细节参见
>
> [为什么要优化 setData ?如何优化 setData ?](https://juejin.cn/post/7155646965978497032)
>
> [小程序极致性能优化之 setData，让你的 setData速度翻倍提升](https://juejin.cn/post/7160475467362304030/)
