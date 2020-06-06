const { src, dest, parallel, series, watch } = require('gulp')
const loadPlugin = require('gulp-load-plugins')
const del = require('del')
const browserSync = require('browser-sync')
// const sass = require('gulp-sass')
// const babel = require('gulp-babel')
// const swig = require('gulp-swig')
// const imagemin = require('gulp-imagemin')

const cwd = process.cwd()
const plugins = loadPlugin()
const bs = browserSync.create()

let config = {
    // default
}

try {
    const loadConfig = require(`${cws}/page.config.json`)
    config = Object.assign({}, config, loadConfig)
} catch (e) {}

const clean = () => {
    return del(['dist', 'temp'])
}

const style = () => {
    return src('src/assets/styles/*.scss', { base: 'src' }) // 将base之下的文件保持原路径信息
        .pipe(plugins.sass({ outputStyle: 'expanded' })) // 完全展开, 右括号单独成行
        .pipe(dest('temp')) // dest是目标, dist是分发, 构建后文件标准文件夹名
}

const script = () => {
    return src('src/assets/scripts/*.js', { base: 'src' })
        .pipe(plugins.babel({ presets: ['@babel/preset-env']})) // babel类似平台, 需要presets进行具体的编译
        .pipe(dest('temp'))
}

const page = () => {
    return src('src/**/*.html', { base: 'src' })
        .pipe(plugins.swig({ data: config.data }))
        .pipe(dest('temp'))
}

const image = () => {
    return src('src/assets/images/**', { base: 'src' })
        .pipe(plugins.imagemin())
        .pipe(dest('dist'))
}

const font = () => {
    return src('src/assets/fonts/**', { base: 'src' })
        .pipe(plugins.imagemin())
        .pipe(dest('dist'))
}

const extra = () => {
    return src('public/**', { base: 'public' })
        .pipe(dest('dist'))
}

const serve = () => {
    watch('src/assets/styles/*.scss', style)
    watch('src/assets/scripts/*.js', script)
    watch('src/*.html', page)
    watch([
        'src/assets/images/**',
        'src/assets/fonts/**',
        'public/**',
    ], bs.reload)

    bs.init({
        notify: false,
        port: 2080, // default 3000
        open: false, // 更新后自动打开浏览器
        // 监视文件变动, 自动刷新页面
        // 可以在每个相关task后.pipe(bs.reload({ stream: true })), 达到相同效果
        files: 'temp/**',
        server: {
            baseDir: ['temp', 'src', 'public'], // 请求时按顺序访问, 直到找到
            routes: {
                '/node_modules': 'node_modules'
            }
        }
    })
}

const useref = () => {
    return src('temp/*.html', { base: 'dist' }) // 需要在构建完成后再进行
        // 会将构件注释中的资源合并到一个文件中
        // 通常用于合并引入的第三方代码
        /**
         *  <!-- build:js assets/scripts/vendor.js -->
            <script src="/node_modules/jquery/dist/jquery.js"></script>
            <script src="/node_modules/popper.js/dist/umd/popper.js"></script>
            <script src="/node_modules/bootstrap/dist/js/bootstrap.js"></script>
            <!-- endbuild -->
             ===>
            <script src="assets/scripts/vendor.js"></script>
         */
        .pipe(plugins.useref({ searchPath: ['dist', '.'] }))
        // 将不同类型文件用对应插件进行压缩
        .pipe(plugins.if(/\.js$/, plugins.uglify()))
        .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
        .pipe(plugins.if(/\.html$/, plugins.htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true
        })))
        // 因为是同步读写, 若写入到同一个目录可能会产生冲突
        // 故构建后的放到temp, release放到dist
        .pipe(dest('dist'))
}

const compile = parallel(style, script, page)

const build = series(
    clean,
    parallel(
        series(compile, useref),
        image,
        font,
        extra,
    )
)

const dev = series(compile, serve)

module.exports = {
    clean,
    build,
    dev,
}
