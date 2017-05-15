var consoleReporter = {

    failures_: [],

    addFailureToFailures_: function (spec) {
        var result = spec.results();
        var failureItem = null;

        var items_length = result.items_.length;
        for (var i = 0; i < items_length; i++) {
            if (result.items_[i].passed_ === false) {
                failureItem = result.items_[i];

                var failure = {
                    spec: spec.suite.getFullName() + " " + spec.description,
                    message: failureItem.message,
                    stackTrace: failureItem.trace.stack
                };

                this.failures_.push(failure);
            }
        }
    },

    reportSpecResults: function (spec) {
        var result = spec.results();
        var log = '\n' + spec.suite.getFullName();
        if (result.skipped) {
        } else if (result.passed()) {
            log += ' PASSED';
            log = log.green;
        } else {
            log += ' FAILED';
            log = log.red;
            this.addFailureToFailures_(spec);
        }
        console.log(log);
    },

    reportRunnerResults: function (runner) {
        this.reportFailures_();
        var message = "\nFinished in " + ((new Date().getTime() - this.startedAt.getTime()) / 1000) + " seconds";
        console.log(message);

        console.log(this.printRunnerResults_(runner));
    },

    printRunnerResults_: function (runner) {
        var results = runner.results();
        var specs = runner.specs();
        var msg = '';
        var skippedCount = 0;
        var passCount = 0;
        specs.forEach(function (spec) {
            var res = spec.results();
            if (res.skipped) {
                skippedCount++;
            } else if (res.passedCount == res.totalCount) {
                passCount++;
            }
        });
        msg += '[Testcases] total: ' + specs.length;
        msg += ', pass: ' + passCount;
        msg += ', fail: ' + (specs.length - passCount - skippedCount);

        //msg += '\n[Assertions] total: ' + results.totalCount;
        //msg += ', pass: ' + results.passedCount;
        //msg += ', fail: ' + results.failedCount;

        msg = results.failedCount > 0 ? msg.red : msg.green;
        return msg;
    },

    reportFailures_: function () {
        if (this.failures_.length === 0) {
            return;
        }

        var failure;
        console.log('Failures:\n');

        for (var i = 0; i < this.failures_.length; i++) {
            failure = this.failures_[i];
            console.log('  ' + (i + 1) + ') ' + failure.spec);
            //console.log('   Message:');
            console.log('     ' + failure.message.red);
            //console.log('   Stacktrace:');
            //console.log('     ' + failure.stackTrace);
        }
    },

    reportRunnerStarting: function (runner) {
        this.startedAt = new Date();
    }
};

var env = jasmine.getEnv();
env.reporter.subReporters_ = [];
env.addReporter(consoleReporter);

exports.reporters = {
    console: consoleReporter
};

exports.setReporter = function (reporters) {
    env.reporter.subReporters_ = [];
    for (let i in reporters) {
        env.addReporter(reporters[i]);
    }
};

