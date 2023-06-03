import { getPathFileds, getValByPath, updateValByPath } from './filedsUtils';
import { isPlainObjectOrArray } from './typeUtils';
import { deepClone } from './deepClone';

export type WatchCallBack<NV = any, OV = any> = (
  newValue?: NV,
  oldValue?: OV,
) => any;

interface ReactiveObj {
  path: string,
  fields: string[],
  proxy: object,
}

export class Watcher {
  private dep: Map<String, Function> = new Map();
  private oldValMap: Map<String, any> = new Map();
  private proxyMap: WeakMap<object, any> = new WeakMap();
  public reactiveWatchMap: Map<String, ReactiveObj> = new Map();

  constructor(private instance: any) {
    const { data, watch } = instance;
    const watchKeys = Object.keys(watch);

    for (let i = 0, len = watchKeys.length; i < len; i++) {
      const path = watchKeys[i];
      const fields = getPathFileds(path);
      const key = fields[0];

      // 初始化被监听对象(不直接监听data的目的是与小程序内部操作隔离，不然小程序自身对data的操作，如toJson，访问和修改等也会触发监听)
      const rawVal = deepClone(data[key]);
      const watchData = {}; // 缩减版data
      watchData[key] = rawVal;

      const watchDataProxy = this.reactive(watchData, path);
      // 保存每个路径的唯一响应式对象
      this.reactiveWatchMap.set(key, {
        path,
        fields,
        proxy: watchDataProxy,
      });
    }
  }

  // 触发依赖
  public trigger() {
    if (this.dep.size) {
      // forEach每次循环都会调用函数，但是有js引擎层面（解释器）的优化
      this.dep.forEach((cb, path) => {
        cb();
        this.oldValMap.delete(path);
      });
      this.dep.clear();

      // for (const [path, cb] of this.dep.entries()) {
      //   cb();
      //   this.oldValMap.delete(path);
      // }

      /**
        不使用 for of 原因：

        一方面for of 内部循环调用迭代器接口（entries()方法实际上返回的就是迭代器，entries()比values()方法更慢），原理类似这样：
        // 遍历迭代器
        const iterator = this.dep[Symbol.iterator](); // 获取Map的迭代器接口（迭代器为各种不同的数据结构提供统一的访问机制）
        while (true) {
          const item = iterator.next();
          if (item.done) break;
          ... // 执行功能代码
        }
        但是具体实现可能要比这复杂的多，单纯使用 while 仅遍历 values() 的时候，上面方法是比forEach（key，value都会处理）快的，
        (while遍历values()更快，但是遍历entries()比forEach慢，所以使用forEach，另外while遍历迭代器可读性较差)
        而for of 仅遍历values()时也比forEach慢，所以js对于遍历迭代器的执行效率似乎并不高。

        ...运算符也是同理，一样是通过遍历迭代器实现，性能也一般，例如原生call是比apply快的（以前，或者某些低版本浏览器，现在差距不大了，
        据说是因为apply参数是数组，内部实现时需要处理这个数组有额外消耗），call(this, a, b, c)本来是比apply(this, [a, b, c])性能高或者持平的，
        但是如果非要用call(this, ...[a, b, c])，那就有点画蛇添足了，强行多出来一个遍历迭代器的工作，性能直接变low

        另一方面，解构也会消耗一定性能（其实内部也是遍历迭代器接口按顺序获取对应的值进行赋值，比正常取值慢2-3倍），所以此处使用forEach，
        仅针对数组解构，对象解构还是通过属性取值，只是换了种写法而已，性能一致。
      */
    }
  };

  // 更新被监听的响应式对象，触发响应式对象的set，收集被监听路径的依赖
  public updateWatchedData(path: string, newVal: any) {
    const fields = getPathFileds(path); // upadteFileds
    if (this.reactiveWatchMap.has(fields[0])) {
      const curWatch = this.reactiveWatchMap.get(fields[0])!;
      // 兄弟属性更新不触发回调
      if (fields.length === curWatch.fields.length && path !== curWatch.path) return;
      // 父属性、子属性、自身更新触发回调
      updateValByPath(curWatch.proxy, path, newVal);
    }
  }

  // 收集被监听路径的依赖
  private track(path: string, cb: WatchCallBack) {
    const newVal = getValByPath(this.instance.data, path);
    const oldVal = this.oldValMap.get(path);
    this.dep.set(path, cb.bind(null, newVal, oldVal));
  };

  // 创建响应式对象(只监听对象和数组)
  private reactive(target: object, path: string) {
    if (!isPlainObjectOrArray(target)) return target;

    // 已经代理过，直接返回
    const existingProxy = this.proxyMap.get(target);
    if (existingProxy) return existingProxy;

    const { watch } = this.instance;
    const cb = watch[path];

    const proxy = new Proxy(target, {
      get: (target, key: string, receiver) => {
        const result = Reflect.get(target, key, receiver);
        // 初次访问时保存旧值
        if (!this.oldValMap.has(path)) this.oldValMap.set(path, deepClone(getValByPath(target, path)));

        // 深度监听（惰性，只有属性被访问时才会开始监听）
        if (isPlainObjectOrArray(result)) {
          return this.reactive(result, path);
        }
        return result;
      },

      set: (target, key, value, receiver) => {
        // 属性被更新时收集依赖
        this.track(path, cb);
        return Reflect.set(target, key, value, receiver);
      },
    });

    this.proxyMap.set(target, proxy);
    return proxy;
  };
}
