#!/usr/bin/env node

process.argv.push('--cwd')
process.argv.push(process.cwd())
process.argv.push('--gulpfile')

// 检查文件是否存在并获取文件的绝对路径
// 如果参数是目录, 会自动以目录下package.json:main文件为目标
process.argv.push(require.resolve('..'))

require('gulp/bin/gulp')