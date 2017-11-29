/**
 * Created by niutf on 16/9/20.
 */
var frisby = require('./frisby'),
    util = require('util'),
    objectUtil = require('./objectUtil'),
    colors = require('colors'),
    qs = require('qs');

const variableRegex = /\${(\w+)}/g;
const singleVariableRegex = /^\${(\w+)}$/;

function TestSuite(name) {
    this.name = name;
    this.settings = {
        enableLog: false,
        baseUrl: '',
        shareCookie: false,
        failedStop: true
    };
    this.cookies = '';
    this.testcases = [];
    this.variables = {};
    return this;
}

/**
 * Set properties for current test suite.
 */
TestSuite.prototype.setup = function (opts) {
    if (opts) {
        if (opts.enableLog != undefined) {
            this.settings.enableLog = opts.enableLog;
        }
        if (opts.baseUrl != undefined) {
            this.settings.baseUrl = opts.baseUrl;
        }
        if (typeof (opts.shareCookie) == 'boolean') {
            this.settings.shareCookie = opts.shareCookie;
        }
        if (typeof (opts.failedStop) == 'boolean') {
            this.settings.failedStop = opts.failedStop;
        }
        if (typeof (opts.headers) === 'object') {
            this.settings.headers = opts.headers;
        }
    }
    return this.settings;
};

/**
 * Set variable values. Variables are visible within current test suite.
 * @param key
 * @param value
 */
TestSuite.prototype.setVariable = function (key, value) {
    this.variables[key] = value;
};

TestSuite.prototype.getVariable = function (key) {
    return this.variables[key];
};

TestSuite.prototype.dynamicCreate = function (method) {
    if (typeof method !== 'function') {
        throw new Error('require factory function');
    }
    this.testcases.push(method);
};

/**
 * create tase case
 * @param name
 */
TestSuite.prototype.createTest = function (name) {
    let self = this;
    var fb = frisby.create(name);
    fb.name = name;
    fb.suiteName = this.name;

    fb.log = function () {
        return this
            .after(function () {
                console.log('');
                console.log(('[' + self.name + '] [' + fb.name + '] REQUEST').blue)
            })
            .inspectRequest()
            .after(function () {
                console.log('');
                console.log(('[' + self.name + '] [' + fb.name + '] RESPONSE').blue)
            })
            .inspectJSON()
    };

    fb._requestArgs = [];
    fb._pushRequest = function () {
        fb._requestArgs = Array.prototype.slice.call(arguments);
        return this;
    };

    fb.get = function (url, data, params) {
        return fb._pushRequest('GET', url, data, params);
    };

    fb.post = function (url, data, params) {
        return fb._pushRequest('POST', url, data, params);
    };

    fb.patch = function (url, data, params) {
        return fb._pushRequest('PATCH', url, data, params);
    };

    fb.put = function (url, data, params) {
        return fb._pushRequest('PUT', url, data, params);
    };

    fb.delete = function (url, data, params) {
        return fb._pushRequest('DELETE', url, data, params);
    };

    fb.head = function (url, params) {
        return fb._pushRequest('HEAD', url, null, params);
    };

    fb.options = function (url, params) {
        return fb._pushRequest('OPTIONS', url, null, params);
    };

    fb._jsonAsserts = [];
    fb._jsonLenghAsserts = [];
    fb._expectJSON = fb.expectJSON;
    fb._expectJSONLength = fb.expectJSONLength;

    fb.withExpects = function (expectMethod) {
        expectMethod(this);
        return this;
    };

    fb.expectJSONLength = function () {
        var args = Array.prototype.slice.call(arguments),
            path = args.length > 1 && typeof args[0] === 'string' && args.shift(),
            length = (typeof args[0] === 'number' || typeof args[0] === 'string') && args.shift();
        fb._jsonLenghAsserts.push([path, length]);
        return this;
    };

    fb.expectJSON = function () {
        var args = Array.prototype.slice.call(arguments),
            path = args.length > 1 && typeof args[0] === 'string' && args.shift(),
            jsonTest = (typeof args[0] === 'object' || typeof args[0] === 'string') && args.shift();
        fb._jsonAsserts.push([path, jsonTest]);
        return this;
    };

    if (this.settings.enableLog) {
        fb.log();
    }
    fb._toss = fb.toss;
    fb.toss = function () {
        self.injectExpectJson(fb);
        self.injectExpectJsonLength(fb)
        self.injectRequestParams(fb);
        self.injectHeaders(fb);
        self.injectTestCaseName(fb);
        return fb._toss();
    };

    this.testcases.push(fb);
    return fb;
};

TestSuite.prototype.compute = function (obj) {
    let self = this;
    let ret = obj;
    if (obj instanceof Array) {
        ret = [];
        for (let i in obj) {
            ret.push(this.compute(obj[i]));
        }
    } else if (typeof obj === 'object') {
        ret = {};
        for (let key in obj) {
            ret[key] = this.compute(obj[key]);
        }
    } else if (typeof(obj) === 'function') {
        ret = obj();
    } else if (typeof(obj) === 'string') {
        // 只有一个变量的形式  如 '${symbol}'
        var matchSingle = obj.match(singleVariableRegex);
        var match = obj.match(variableRegex);
        if (matchSingle) {
            ret = self.variables[matchSingle[1]];
        } else if (match) {
            ret = obj.replace(variableRegex, function (key) {
                let name = key.substring(2, key.length - 1);
                return self.variables[name];
            });
        }
    }
    return ret;
};

TestSuite.prototype.injectExpectJson = function (cur) {
    for (let i in cur._jsonAsserts) {
        let test = cur._jsonAsserts[i];
        let path = test[0];
        let testJson = test[1];
        let clone = this.compute(testJson);
        if (path) {
            cur._expectJSON(test[0], clone);
        } else {
            cur._expectJSON(clone);
        }
    }
};

TestSuite.prototype.injectExpectJsonLength = function (test) {
    for (let i in test._jsonLenghAsserts) {
        let cur = test._jsonLenghAsserts[i];
        let path = cur[0];
        let length = cur[1];
        let computedLength = this.compute(length);
        if (path) {
            test._expectJSONLength(path, computedLength);
        } else {
            test._expectJSONLength(computedLength);
        }
    }
};

TestSuite.prototype.injectRequestParams = function (cur) {
    let args = this.compute(cur._requestArgs);
    args[1] = this.settings.baseUrl ? this.settings.baseUrl + args[1] : args[1];
    if (args[0] === 'GET' && typeof args[2] === 'object') {
        args[1] += '?' + qs.stringify(args[2]);
        args[2] = null;
    }
    cur._request.apply(cur, args);
};

TestSuite.prototype.injectHeaders = function (test) {
    let args = this.compute(this.settings.headers);
    for (let i in args) {
        test.addHeader(i, args[i]);
    }
};

TestSuite.prototype.injectTestCaseName = function (test) {
    var name = this.compute(test.name);
    test.name = name;
    test.current.describe = name;
};

/**
 * Execute all tests of current test suite in sequence, using the given data.
 * @param data
 * @param callback
 */
TestSuite.prototype.run = function (data, callback) {
    let self = this;
    this.variables = data ? data : {};

    console.log(('TEST SUITE [' + this.name + '] STARTED').blue);
    console.log(('DATASET: ' + JSON.stringify(this.variables)).blue);

    let testsToRun = self.testcases.slice();
    var addCallback = function () {
        if (testsToRun.length > 0) {
            let test = testsToRun.shift();
            if (typeof(test) === 'function') {
                test = test(self.variables);
                testsToRun.splice.apply(testsToRun, [0, 0].concat(test));
                addCallback();
            } else {
                test.after(function (error, res) {
                    if (res.headers['set-cookie']) {
                        self.cookies = self.cookies + res.headers['set-cookie'].join('; ');
                    }
                    if (!self.settings.failedStop || !this.current.expectsFailed) {
                        addCallback();
                    }
                });
                if (self.settings.shareCookie) {
                    test.addHeader('cookie', self.cookies);
                }
                test.toss();
            }
        } else {
            if (typeof callback === 'function') {
                callback();
            }
        }
    };

    addCallback();
};

TestSuite.prototype.runWithDataSet = function (dataSet) {
    if (!(dataSet instanceof Array)) {
        throw new Error('require array dataSet');
    }
    let self = this;
    var i = 0;

    let settings = objectUtil.deepClone(this.settings);
    let initialTests = self.testcases.slice();
    let run = function () {
        let cur = dataSet[i];
        if (cur) {
            i++;
            // reset settings and cookies.
            self.settings = objectUtil.deepClone(settings);
            self.cookies = '';
            self.run(cur, run);
        }
        self.testcases = initialTests.slice();
    };
    run();
};

// Public Methods and Fields
/**
 * create a new test suite with the given name.
 * @param name
 * @returns {TestSuite}
 */
exports.createTestSuite = function (name) {
    return new TestSuite(name);
};

exports.frisbyVersion = '0.8.5';
exports.version = '0.0.1';

