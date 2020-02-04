const gulp = require('gulp');
const cp = require('child_process');

function make(target, cb) {
    let cl = `node make.js ${target}`;
    console.log('------------------------------------------------------------');
    console.log('> ' + cl);
    console.log('------------------------------------------------------------');

    try {
        cp.execSync(cl, {
            cwd: __dirname,
            stdio: 'inherit'
        });
    }
    catch (error) {
        let errorMessage = error.output ? error.output.toString() : error.message;
        console.error(errorMessage);
        cb(new gutil.PluginError(errorMessage));
        return false;
    }

    return true;
}

gulp.task('build', (cb) => make('build', cb));
gulp.task('package', (cb) => make('package', cb));
gulp.task('default', ['build']);