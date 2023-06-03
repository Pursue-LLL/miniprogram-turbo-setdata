/* eslint-disable no-native-reassign */
/* eslint-disable no-param-reassign */

import { Watcher, WatchCallBack } from './watcher';
import TurboSetData, { TurboOpts } from './turboSetData';

type Page = WechatMiniprogram.Page.Constructor;
type Component = WechatMiniprogram.Component.Constructor;
interface CompOpts extends WechatMiniprogram.Component.TrivialOption {
  watch?: {
    [propName: string]: WatchCallBack,
  },
};

/**
 * 增强单个页面
 * @param {object} pageOpts 页面选项（选项式api）
 */
const turboPage: Page = function (pageOpts, options?: { turboOptions: TurboOpts }): void {
  const { onLoad, watch = null } = pageOpts;
  let watcher: Watcher | null = null;
  pageOpts.onLoad = function (...args: any) {
    if (watch) watcher = new Watcher(this);
    new TurboSetData(this as WechatMiniprogram.Page.TrivialInstance, watcher, options?.turboOptions); // 增强setData
    onLoad?.apply(this, args);
  };

  Page(pageOpts);
};

/**
 * 增强单个组件
 * @param {*} compOpts 组件选项
 * @returns {string}
 */
const turboComponent: Component = function (compOpts: CompOpts, options?: { turboOptions: TurboOpts }): string {
  const { lifetimes = {}, watch } = compOpts;
  let ref: any = compOpts;
  if (lifetimes.created) {
    ref = compOpts.lifetimes;
  }
  const oriCreated = ref.created || function () { };
  let watcher: Watcher | null = null;
  ref.created = function (...args: any[]) {
    if (watch) {
      this.watch = watch;
      watcher = new Watcher(this);
    };
    new TurboSetData(this as WechatMiniprogram.Component.TrivialInstance, watcher, options?.turboOptions); // 增强setData
    oriCreated?.apply(this, args);
  };

  return Component(compOpts);
};

/**
 * 增强全局所有页面钩子
 */
function useTurboAllPage() {
  const originalPage = Page;
  Page = function (pageOpts, options?: { turboOptions: TurboOpts }) {
    const { onLoad, watch = null } = pageOpts;
    let watcher: Watcher | null = null;
    pageOpts.onLoad = async function (...args) {
      if (watch) watcher = new Watcher(this);
      new TurboSetData(this as WechatMiniprogram.Page.TrivialInstance, watcher, options?.turboOptions); // 增强setData
      onLoad?.apply(this, args);
    };
    originalPage(pageOpts);
  };
}

/**
 * 增强全局所有组件钩子
 */
function useTurboAllComponent() {
  const originalComponent = Component;
  Component = function (compOpts: any, options?: { turboOptions: TurboOpts }): string {
    const { lifetimes = {}, watch = null } = compOpts;
    let lifetimesObj = compOpts;
    if (lifetimes.created) {
      lifetimesObj = compOpts.lifetimes;
    }
    const oriCreated = lifetimesObj.created || function () { };
    let watcher: Watcher | null = null;
    lifetimesObj.created = function (...args: any[]) {
      if (watch) {
        this.watch = watch;
        watcher = new Watcher(this);
      };
      new TurboSetData(this, watcher, options?.turboOptions); // 增强setData
      oriCreated?.apply(this, args);
    };
    return originalComponent(compOpts);
  };
};

export {
  turboPage as Page,
  turboComponent as Component,
  useTurboAllPage,
  useTurboAllComponent,
};
