let frisby = require('../lib/frisbyPlus');

let baseUrl = 'https://api.github.com';
let searchUrl = '/search/repositories';
let detailUrl = '/repos/';

let testSuite = frisby.createTestSuite('Dynamic create test example');

testSuite.setup({
    enableLog: true,
    baseUrl: baseUrl,
    headers: {
        'User-Agent': 'frisby-plus'
    }
});

testSuite.createTest('Search')
    .get(searchUrl, {
        q: 'frisby',
        per_page: 3
    })
    .expectJSONTypes('items.*', {
        id: Number,
        name: String,
        full_name: String
    })
    .afterJSON(function (json) {
        testSuite.setVariable('fullNames', json.items.map(function (item) {
            return item.full_name;
        }));
    });

// dynamic create testcases based on the response of previous search request.
testSuite.dynamicCreate(function () {
    let fullNames = testSuite.getVariable('fullNames');
    return fullNames.map(function (name) {
        return testSuite.createTest('Repo detail ' + name)
            .get(detailUrl + name)
            .expectStatus(200);
    });
});

testSuite.run();



