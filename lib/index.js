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
    // dfault config
    build: {
        src: 'src',
        dist: 'dist',
        temp: 'temp',
        public: 'public',
        paths: {
            styles: 'assets/styles/*.scss',
            scripts: 'assets/scripts/*.js',
            pages: '*.html',
            images: 'assets/images/**',
            fonts: 'assets/fonts/**',
        }
    }
}

try {
    const loadConfig = require(`${cwd}/page.config.js`)
    config = Object.assign({}, config, loadConfig)
} catch (e) {}

const clean = () => {
    return del([config.build.dist, config.build.temp])
}

const style = () => {
    // cwd指定当前目录, 默认是当前命令目录
    return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.sass({ outputStyle: 'expanded' })) // 完全展开, 右括号单独成行
        .pipe(dest(config.build.temp)) // dest是目标, dist是分发, 构建后文件标准文件夹名
}

const script = () => {
    return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
        // 作为模块时需要require得到包, 这样会从当前文件目录依次往上找依赖
        // 直接使用path会从cws找
        .pipe(plugins.babel({ presets: [require('@babel/preset-env')]})) // babel类似平台, 需要presets进行具体的编译
        .pipe(dest(config.build.temp))
}

const page = () => {
    return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.swig({ data: config.data, defaults: { cache: false } }))
        .pipe(dest(config.build.temp))
}

const image = () => {
    return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}

const font = () => {
    return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}

const extra = () => {
    return src('**', { base: config.build.public, cwd: config.build.public })
        .pipe(dest(config.build.dist))
}

const serve = () => {
    watch(config.build.paths.styles, { cwd: config.build.src }, style)
    watch(config.build.paths.scripts, { cwd: config.build.src }, script)
    watch(config.build.paths.pages, { cwd: config.build.src }, page)
    watch([
        config.build.paths.images,
        config.build.paths.fonts,
    ], { cwd: config.build.src }, bs.reload)
    watch([
        '**'
    ], { cwd: config.build.public }, bs.reload)

    bs.init({
        notify: false,
        port: 2080, // default 3000
        open: false, // 更新后自动打开浏览器
        // 监视文件变动, 自动刷新页面
        // 可以在每个相关task后.pipe(bs.reload({ stream: true })), 达到相同效果
        files: `${config.build.temp}/**`,
        server: {
            baseDir: [config.build.temp, config.build.src, config.build.public], // 请求时按顺序访问, 直到找到
            routes: {
                '/node_modules': 'node_modules'
            }
        }
    })
}

const useref = () => {
    return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp }) // 需要在构建完成后再进行
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
        .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
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
        .pipe(dest(config.build.dist))
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
