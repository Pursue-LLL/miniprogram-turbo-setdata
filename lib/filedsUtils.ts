/* eslint-disable complexity */
/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
import { warn } from './log';
import { isArray, isPlainObjectOrArray } from './typeUtils';

// 全局解析路径缓存（生命周期内都有效）
const filedsCacheMap = new Map();

/**
 * 解析路径为字段数组
 * @example
 * getPathFileds('arr[0].a.b');
 * // ['arr', '0', 'a', 'b']
 * @export
 * @param {string} path 解析路径
 * @returns {string[]}
 */
export function getPathFileds(path: string): string[] {
  // 取缓存解析过的路径
  if (filedsCacheMap.has(path)) return filedsCacheMap.get(path);
  const segments: string[] | number[] = path.split('.'); // 分割字段片段， 如 a[5].b[4][0].c
  let fileds = segments; // 保存字段名

  // 处理包含数组的情况，例如 a[5].b[4][0].c 路径，要把b[4][0]这样的格式处理成[b, 4, 0]
  if (path.includes('[')) {
    fileds = [];
    let i = 0;
    const len = segments.length;
    while (i < len) {
      const segment = segments[i];
      if (segment.includes('[')) {
        const arrFileds = segment.split(/[[\]]/); // ["b", "4", "", "0", ""]
        // for循环比push(...arrFileds)更快，而且加入判断非必要不push会更快
        for (let i = 0, len = arrFileds.length; i < len; i++) {
          if (arrFileds[i] !== '') fileds[fileds.length] = arrFileds[i]; // 使用下标赋值比 fileds.push(arrFileds[i])更快
        }
        // fileds.push(...arrFileds); // push(...arr)比concat效率更高，push直接操作原数组，concat会创建新数组
      } else { // 如果是被'.'分割完的字段直接push
        fileds.push(segment);
      }
      i++;
    }
  }
  filedsCacheMap.set(path, fileds); // 缓存解析过的路径
  return fileds;
}

/**
 * 链式取值
 *
 * @param {object} target
 * @param {string} path
 * @returns {*}
 */
export function getValByPath(target: object, path: string): any {
  // 比 !(/[\\.\\[]/.test(path)) 性能高约15倍，比 !(path.includes('.') || path.includes('[')) 高约6倍
  if (!path.includes('.') && !path.includes('[')) return target[path];

  const fileds = getPathFileds(path);
  // const val = fileds.reduce((pre, cur) => pre?.[cur], target);
  // while 比 reduce快(2-3倍)，实际上while比缓存len的for循环更快，但是数据量较少时差异微乎其微
  let i = 0;
  let val = target;
  const len = fileds.length;
  while (i < len) {
    val = val?.[fileds[i]];
    i++;
  }
  return val;
}

/**
 * 链式更新值
 *
 * @param {*} target
 * @param {string} path
 * @param {*} value
 */
export function updateValByPath(target: any, path: string, value: any): void {
  // 非链式属性直接赋值
  if (!path.includes('.') && !path.includes('[')) return target[path] = value;
  const fileds = getPathFileds(path);

  let i = 0;
  const len = fileds.length;
  while (i < len) {
    const key = fileds[i];
    if (i + 1 === len) { // 当前键是被更新路径的最后一个字段， 如 'obj.a.b'中的b则直接赋值
      target[key] = value;
      return;
    }

    // 创建对象或数组

    // 下一个字段的形式决定当前字段对应的数据类型，例如，arr[0]，0决定了arr字段是数组类型，如果字段为纯数字则判定为数组(忽略对象键为数字的情况)，key不会为''
    const curKeyDataType = isNaN(Number(fileds[i + 1])) ? 'object' : 'array';
    let typeMutation = false;
    const val = target[key];
    if (val) {
      const oriDataType = isArray(val) ? 'array' : 'object';
      typeMutation = oriDataType !== curKeyDataType || !isPlainObjectOrArray(val);
    }
    // 如果路径值不存在，或者存在但是数据类型变了，则创建对应数据类型
    if (!val || typeMutation) {
      target[key] = curKeyDataType === 'object' ? {} : [];
      // !更新 data 中不存在引用的属性或随意变更数据类型，理论上工具不会阻止这种行为，但是并不推荐，因为这种写法可能不利于维护
      warn(`updated field "${path}" does not exist in the data or datatype is inconsistent, may not be easy to maintain.`);
    }

    target = target[key];
    i++;
  }
}
