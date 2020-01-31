var check = require('validator');
var fs = require('fs');
var ncp = require('child_process');
var os = require('os');
var path = require('path');
var process = require('process');
var shell = require('shelljs');

//------------------------------------------------------------------------------
// shell functions
//------------------------------------------------------------------------------
var shellAssert = function () {
    var errMsg = shell.error();
    if (errMsg) {
        throw new Error(errMsg);
    }
}

var cd = function (dir) {
    var cwd = process.cwd();
    if (cwd != dir) {
        console.log('');
        console.log(`> cd ${path.relative(cwd, dir)}`);
        shell.cd(dir);
        shellAssert();
    }
}
exports.cd = cd;

var cp = function (options, source, dest) {
    if (dest) {
        shell.cp(options, source, dest);
    }
    else {
        shell.cp(options, source);
    }

    shellAssert();
}
exports.cp = cp;

var mkdir = function (options, target) {
    if (target) {
        shell.mkdir(options, target);
    }
    else {
        shell.mkdir(options);
    }

    shellAssert();
}
exports.mkdir = mkdir;

var rm = function (options, target) {
    if (target) {
        shell.rm(options, target);
    }
    else {
        shell.rm(options);
    }

    shellAssert();
}
exports.rm = rm;

var fail = function (message) {
    console.error('ERROR: ' + message);
    process.exit(1);
}
exports.fail = fail;

//------------------------------------------------------------------------------

var assert = function (value, name) {
    if (!value) {
        throw new Error('"' + name + '" cannot be null or empty.');
    }
}
exports.assert = assert;

var rp = function (relPath) {
    return path.join(pwd() + '', relPath);
}
exports.rp = rp;

var ensureExists = function (checkPath) {
    assert(checkPath, 'checkPath');
    var exists = test('-d', checkPath) || test('-f', checkPath);

    if (!exists) {
        fail(checkPath + ' does not exist');
    }
}
exports.ensureExists = ensureExists;

var pathExists = function (checkPath) {
    return test('-d', checkPath) || test('-f', checkPath);
}
exports.pathExists = pathExists;

var buildNodeTask = function (taskPath, outDir) {
    var originalDir = pwd();
    cd(taskPath);
    var packageJsonPath = rp('package.json');
    if (test('-f', packageJsonPath)) {
        run('npm install');
    }

    run('tsc --outDir ' + outDir + ' --rootDir ' + taskPath);
    cd(originalDir);
}
exports.buildNodeTask = buildNodeTask;

var buildUIContribution = function (source, destination) {
    
    var originalDir = pwd();
    cd(destination);

    var packageJsonPath = rp('package.json');
    if (test('-f', packageJsonPath)) {
        run('npm install');
    }

    run('npm run buildWeb');
    cd(originalDir);
}
exports.buildUIContribution = buildUIContribution;

var copyContent = function (source, destination) {
    let files = fs.readdirSync(source);
    files.forEach(function(file) 
    {
        if (fs.statSync(path.join(source, file)).isDirectory()) 
        {
            cp("-r", path.join(source, file), destination);
        }
        else 
        {
            cp(path.join(source, file), destination);
        }
        
    });

}
exports.copyContent = copyContent;

var test = function (options, p) {
    var result = shell.test(options, p);
    shellAssert();
    return result;
}
exports.test = test;

var run = function (cl, inheritStreams, noHeader) {
    if (!noHeader) {
        console.log();
        console.log('> ' + cl);
    }

    var options = {
        stdio: inheritStreams ? 'inherit' : 'pipe'
    };
    var rc = 0;
    var output;
    try {
        output = ncp.execSync(cl, options);

        
    }
    catch (err) {
        if (!inheritStreams) {
            console.error(err.output ? err.output.toString() : err.message);
        }

        process.exit(1);
    }

    console.log((output || '').toString().trim());
    return (output || '').toString().trim();
}
exports.run = run;

var ensureTool = function (name, versionArgs, validate) {
    console.log(name + ' tool:');
    var toolPath = which(name);
    if (!toolPath) {
        fail(name + ' not found.  might need to run npm install');
    }

    if (versionArgs) {
        var result = exec(name + ' ' + versionArgs);
        if (typeof validate == 'string') {
            if (result.output.trim() != validate) {
                fail('expected version: ' + validate);
            }
        }
        else {
            validate(result.output.trim());
        }
    }

    console.log(toolPath + '');
}
exports.ensureTool = ensureTool;

var banner = function (message, noBracket) {
    console.log();
    if (!noBracket) {
        console.log('------------------------------------------------------------');
    }
    console.log(message);
    if (!noBracket) {
        console.log('------------------------------------------------------------');
    }
}
exports.banner = banner;


//------------------------------------------------------------------------------
// task.json functions
//------------------------------------------------------------------------------
var fileToJson = function (file) {
    var jsonFromFile = JSON.parse(fs.readFileSync(file).toString());
    return jsonFromFile;
}
exports.fileToJson = fileToJson;

// Validates the structure of a task.json file.
var validateTask = function (task) {
    if (!task.id || !check.isUUID(task.id)) {
        fail('id is a required guid');
    };

    if (!task.name || !check.isAlphanumeric(task.name)) {
        fail('name is a required alphanumeric string');
    }

    if (!task.friendlyName || !check.isLength(task.friendlyName, 1, 40)) {
        fail('friendlyName is a required string <= 40 chars');
    }

    if (!task.instanceNameFormat) {
        fail('instanceNameFormat is required');
    }
};
exports.validateTask = validateTask;