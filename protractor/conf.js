exports.config = {
    baseUrl: "http://localhost:9000",
    seleniumServerJar: "../node_modules/protractor/selenium/selenium-server-standalone-2.47.1.jar",
    specs: ['e2e/*.js'],
    framework: 'jasmine2',
    onPrepare: function () {
        global.EC = protractor.ExpectedConditions;
        loadFixtures();
    }
};

function loadFixtures() {
    console.log('Loading fixtures');

    var PostgresFixture = require('easy-postgresql-fixture');
    var fixture = require('easy-fixture');

    var postgresFixture = new PostgresFixture({
        database: 'sitnet_test',
        dir: 'fixtures',
        out: 'test_dump.sql',
        options: '-U sitnet'
    });

    fixture.use(postgresFixture);

    fixture.load()
}
