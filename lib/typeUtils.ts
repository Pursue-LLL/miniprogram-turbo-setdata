
// 获取数据类型 如：[object Array]
export const getTypeString = (val: unknown): string => Object.prototype.toString.call(val);

// 获取原始数据类型 如：array
export const getRawType = (val: unknown) => getTypeString(val).slice(8, -1)
  .toLowerCase();

export const isObject = (val: unknown): val is Record<any, any> => val !== null && typeof val === 'object';

export const { isArray } = Array;

/**
 * 判断是否是普通对象
 *
 * 直接调用constructor属性判断对象，替代调用函数转成字符串，减少性能开销，
 * 一般情况都可以通过constructor来判断，但是constructor属性不稳定，容易被更改，
 * 而且没有原型的对象（如Object.create(null)创建的纯净对象）是没有constructor属性的，
 * 此时仍然需要使用toString()方法来判断。
 *
 * @param {unknown} val
 * @returns {val is object}
 */
export const isPlainObject = (val: unknown): val is object => {
  if (val?.constructor) return val.constructor === Object;
  return getTypeString(val) === '[object Object]';
};

export const isPlainObjectOrArray = (val: unknown): boolean => isPlainObject(val) || isArray(val);


