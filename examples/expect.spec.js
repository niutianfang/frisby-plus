let frisby = require('../lib/frisbyPlus');

let searchUrl = 'https://api.github.com/search/repositories';

var testSuite = frisby.createTestSuite('Expect Example');

testSuite.setup({
    headers: {
        'User-Agent': 'frisby-plus'
    },
    enableLog: true
});

testSuite.createTest('Expect JSON types')
    .get(searchUrl, {
        q: 'frisby',
        per_page: 10
    })
    .expectStatus(200)
    .expectJSONLength('items', 10)
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
        incomplete_results: Boolean,
        total_count: Number
    })
    .expectJSON('items.?', {
        full_name: 'vlucas/frisby',
        name: 'frisby'
    })
    .expectJSON({
        incomplete_results: false
    });

testSuite.run();




