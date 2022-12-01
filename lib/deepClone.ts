/* eslint-disable no-plusplus */

import { isPlainObjectOrArray } from './typeUtils';

/**
 * 深拷贝
 *
 * @param {*} target 拷贝目标
 * @param {WeakMap} [cache=new WeakMap()] 内部缓存，无需传入
 * @returns {*}
 */
export function deepClone(target: any, cache = new WeakMap()): any {
  // 如果已经拷贝过该对象，则直接返回拷贝结果，不再进入递归逻辑，提高性能，并且能够防止循环引用
  // WeakMap可在target不被引用时自动垃圾回收，节省内存消耗
  if (cache.get(target)) return cache.get(target);

  // 处理数组和对象
  if (isPlainObjectOrArray(target)) {
    const cloneTarget = new target.constructor(); // 直接获取数组或对象的构造器，并实例化
    cache.set(target, cloneTarget);
    const keys = Reflect.ownKeys(target); // ownKeys 可遍历不可枚举属性和symbol
    for (let i = keys.length; i--;) {
      const key = keys[i];
      cloneTarget[key] = deepClone(target[key], cache); // 递归拷贝每一层
    }
    return cloneTarget;
  }

  // 其他引用类型: 小程序会把 typeof 为 object类型的数据（不包含null）都转为 {}，这是渲染层需要的数据结构，
  // 例如data: { obj: { reg: /\w/ } }，会变成{ obj: { reg: { } } }，所以此处无需处理 Map Set Date 等类型。
  // 基本类型: undefined，Symbol，null等直接返回
  // 函数类型: 支持返回函数，从基础库 2.0.9 开始，对象类型的属性和 data 字段中可以包含函数类型的子字段，即可以通过对象类型的属性字段来传递函数。
  return target;
}
