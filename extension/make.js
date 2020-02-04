// parse command line options
var minimist = require('minimist');
var mopts = {
    string: [
        'node',
        'runner',
        'server',
        'suite',
        'task',
        'version'
    ]
};
var options = minimist(process.argv, mopts);

// remove well-known parameters from argv before loading make,
// otherwise each arg will be interpreted as a make target
process.argv = options._;

// modules
var make = require('shelljs/make');
var fs = require('fs');
var os = require('os');
var path = require('path');
var semver = require('semver');
var util = require('./make-util');

// util functions
var cd = util.cd;
var cp = util.cp;
var mkdir = util.mkdir;
var rm = util.rm;
var test = util.test;
var run = util.run;
var banner = util.banner;
var fail = util.fail;
var ensureExists = util.ensureExists;
var buildNodeTask = util.buildNodeTask;
var buildUIContribution = util.buildUIContribution;
var copyContent = util.copyContent;
var ensureTool = util.ensureTool;

var validateTask = util.validateTask;
var fileToJson = util.fileToJson;

// global paths
var buildTaskPath = path.join(__dirname, '_build', 'Tasks');
var buildPath = path.join(__dirname, '_build');
var packagePath = path.join(__dirname, '_package');

// node min version
var minNodeVer = '6.10.3';
if (semver.lt(process.versions.node, minNodeVer)) {
    fail('requires node >= ' + minNodeVer + '.  installed: ' + process.versions.node);
}

// resolve list of tasks
var taskList = [];
fs.readdirSync(path.join(__dirname, 'Tasks')).forEach(file => {
    taskList.push(file);
})

target.clean = function () {
    rm('-Rf', path.join(__dirname, '_build'));
    rm('-Rf', path.join(__dirname, '_package'));
    mkdir('-p', buildTaskPath);
    mkdir('-p', packagePath);
};

//
// ex: node make.js build
// ex: node make.js build --task ShellScript
//
target.build = function() {
    target.clean();

    //ensureTool('tsc', '--version', 'Version 2.3.4');
    ensureTool('npm', '--version', function (output) {
        if (semver.lt(output, '5.6.0')) {
            fail('Expected 5.6.0 or higher. To fix, run: npm install -g npm');
        }
    });

    /**
     * Build tasks
     */
    taskList.forEach(function(taskName) {
        banner('Building: ' + taskName);
        var taskPath = path.join(__dirname, 'Tasks', taskName);
        ensureExists(taskPath);

        console.log(taskPath);

        // load the task.json
        var outDir;
        var shouldBuildNode = test('-f', path.join(taskPath, 'tsconfig.json'));
        var taskJsonPath = path.join(taskPath, 'task.json');
        if (test('-f', taskJsonPath)) {
            var taskDef = fileToJson(taskJsonPath);
            validateTask(taskDef);
            outDir = path.join(buildTaskPath, taskName);

            // determine the type of task
            shouldBuildNode = shouldBuildNode || taskDef.execution.hasOwnProperty('Node');
        }
        else {
            outDir = path.join(buildTaskPath, path.basename(taskPath));
        }

        mkdir('-p', outDir);

        // build Node task
        if (shouldBuildNode) {
            buildNodeTask(taskPath, outDir);
        }

        copyContent(taskPath, outDir);

        banner("Task built : " + taskName);
    });

    /**
     * Build UI contribution
     */
    banner('Building UI Contribution');
    var uiContributionPath = path.join(__dirname, 'UIContribution');
    ensureExists(uiContributionPath);

    cp("-r", uiContributionPath, buildPath);

    var destUIContributionPath = path.join(buildPath, 'UIContribution');
    buildUIContribution(uiContributionPath, destUIContributionPath);

    banner('Built UI Contribution');

    banner('Copying remaining content');
    /**
     * Copy images folder
     */
    var imagesSourcePath = path.join(__dirname, 'images');
    ensureExists(imagesSourcePath);

    var imagesDestPath = path.join(buildPath);

    cp("-r", imagesSourcePath, imagesDestPath);

    /**
     * Copy other files.
     */
    
    cp('vss-extension.json', buildPath);
    cp('ThirdPartyNotices.txt', buildPath);
    cp('README.md', buildPath);

    banner('Build successful', true);
}
 
target.package = function() {
    banner('Starting package process...')

    var packagingCmd = "tfx extension create --manifest-globs vss-extension.json --root " + buildPath + " --output-path " + packagePath + " --bypass-validation";
    run(packagingCmd);

    banner('VSIX generated successfully');
}
