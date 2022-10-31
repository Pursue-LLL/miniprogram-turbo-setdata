const path = require('path');

import pkg from './package.json'
// 压缩代码
import { terser } from "rollup-plugin-terser";
// 添加版权信息
import license from 'rollup-plugin-license';
// 编译 ts
import ts from "rollup-plugin-typescript2"


export default {
  input: path.resolve(__dirname, 'lib/index.ts'), // __dirname指的是当前文件所在文件夹的绝对路径。

  plugins: [
    ts(),
    terser({ compress: { } }),
    license({
      banner: {
        content: {
          file: path.join(__dirname, 'LICENSE'),
          encoding: 'utf-8', // Default is utf-8
        },
      },
    }),
  ],
  output: [
    {
      file: pkg.main,
      format: `esm`
    },
  ],
}
