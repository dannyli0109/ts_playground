const { src, dest, series, task, parallel, watch } = require("gulp");
const ts = require("gulp-typescript");
const fs = require("fs");
const browserify = require("browserify");
const babelify = require("babelify");
const source = require("vinyl-source-stream");
const buffer = require("vinyl-buffer");
const sourcemaps = require("gulp-sourcemaps");
const uglify = require("gulp-uglify");
const size = require("gulp-size");
const zip = require("gulp-zip");
const micro = require("gulp-micro");
const htmlmin = require("gulp-htmlmin");
const gulpSass = require("gulp-sass");
const dartSass = require("sass");
const sass = gulpSass(dartSass);
const concat = require("gulp-concat");
const rimraf = require("rimraf");
const cssmin = require("gulp-cssmin");
const browserSync = require("browser-sync").create();

const htmlPaths = ["src/**/*.html", "src/**/*.css", "src/**/*.ttf"];
const tsFilesGlob = ["src/**/*.ts", "!./node_modules/**/*.ts"];
const stypePaths = ["src/**/*.scss"];
const workingPaths = ["src/working/**/*"];
const buildPaths = ["./build/**/*", "!./build/working/**/*"];

function buildTs() {
  const tsconfig = require("./src/tsconfig.json");
  return src(tsFilesGlob)
    .pipe(ts(tsconfig.compilerOptions))
    .pipe(dest("./lib"));
}

function doBrowserify() {
  const b = browserify({
    entries: "./lib/index.js",
    debug: false,
  }).transform(
    babelify.configure({
      presets: ["es2015"],
    })
  );
  return (
    b
      .bundle()
      .pipe(source("bundle.js"))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      // .pipe(uglify())
      .pipe(sourcemaps.write("./"))
      .pipe(dest("./build"))
  );
}

function dist() {
  return src("./build/*")
    .pipe(zip("archive.zip"))
    .pipe(size())
    .pipe(micro({ limit: 13 * 1024 }))
    .pipe(dest("./dist"));
}

function moveWorkingDirectory() {
  return src(workingPaths).pipe(dest("./build/working"));
}

function buildHtml() {
  return src(htmlPaths)
    .pipe(
      htmlmin({
        collapseWhitespace: true,
        removeAttributeQuotes: true,
        removeComments: true,
      })
    )
    .pipe(dest("./build"));
}

function buildStyles() {
  return src(stypePaths)
    .pipe(sass().on("error", sass.logError))
    .pipe(concat("build.css"))
    .pipe(cssmin())
    .pipe(dest("./build"));
}

function clean(cb) {
  rimraf.sync("lib");
  rimraf.sync("build");
  rimraf.sync("dist");
  cb();
}

function createTsconfig(cb) {
  if (!fs.existsSync("./src/tsconfig.json")) {
    fs.writeFileSync(
      "./src/tsconfig.json",
      `{
            "compilerOptions": {
                "module": "ES2015",
                "target": "ES2018",
                "noImplicitAny": true,
                "removeComments": true,
                "preserveConstEnums": true,
                "sourceMap": true,
                "allowJs": true,
                "checkJs": false
            }
        }`
    );
  }
  cb();
}

function serve() {
  browserSync.init({
    server: {
      baseDir: "./build",
    },
  });
}

function reload() {
  browserSync.reload();
}

function watchScss() {
  watch(stypePaths, buildStyles);
}

function watchTs() {
  watch(tsFilesGlob, series(buildTs, doBrowserify));
}

function watchHtml() {
  watch(htmlPaths, buildHtml);
}

function watchWorking() {
  watch(workingPaths, moveWorkingDirectory);
}

function watchBuild() {
  watch(buildPaths).on("change", reload);
}

exports.build = series(
  clean,
  moveWorkingDirectory,
  buildHtml,
  buildStyles,
  buildTs,
  doBrowserify
  // dist
);

exports.default = series(
  exports.build,
  parallel(watchScss, watchTs, watchHtml, watchWorking, watchBuild, serve)
);
