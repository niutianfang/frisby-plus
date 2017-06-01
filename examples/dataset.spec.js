let frisby = require('../lib/frisbyPlus');

let dataset = [
    {
        searchKey: 'frisby'
    }, {
        searchKey: 'frisby-plus'
    }, {
        searchKey: 'jasmine-node'
    }];

let searchUrl = 'https://api.github.com/search/repositories?q=${searchKey}';

var testSuite = frisby.createTestSuite('DateSet Example');

testSuite.setup({
    headers: {
        'User-Agent': 'frisby-plus'
    },
    shareCookie: false,
    enableLog: true
});

testSuite.createTest('Search')
    .get(searchUrl)
    .expectStatus(200)
    .expectJSONTypes('items.*', {
        'id': Number,
        'name': String,
        'owner': Object,
        'private': Boolean,
        'html_url': String,
        'score': Number,
        'created_at': Date
    })
    .expectJSONTypes({
        'incomplete_results': Boolean,
        'total_count': Number
    });

testSuite.runWithDataSet(dataset);




