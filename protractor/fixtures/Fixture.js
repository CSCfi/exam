var path = require('path');
var sqlFixtures = require('sql-fixtures');
var fs = require('fs');
var mergeJSON = require('merge-json');

var Fixture = function () {

    var baseData = ['users.json', 'courses.json', 'organisations.json', 'questions.json'];

    var dbConfig = {
        client: 'pg',
        connection: {
            host: 'localhost',
            user: 'sitnet',
            password: 'sitnetsitnet',
            database: 'sitnet_protractor',
            port: 5432
        }
    };

    this.loadFixtures = function (files) {
        files = files || baseData;
        console.log("Loading fixtures from files: " + files);
        var data = {};
        for (var i=0; i < files.length; i++) {
            var p = path.resolve(__dirname, files[i]);
            data = mergeJSON.merge(data, JSON.parse(fs.readFileSync(p, 'utf8')));
        }
        return sqlFixtures.create(dbConfig, data);
    };

    this.clearFixtures = function () {
        var tables = ['app_user', 'exam', 'organisation', 'question'];
        console.log("Clearing fixtures from tables: " + tables);
        var queries = [];
        for (var i = 0; i < tables.length; i++) {
            queries.push('truncate table ' + tables[i] + ' cascade');
        }
        return sqlFixtures.create(dbConfig, {
            sql: queries
        })
    };

    this.destroy = function () {
        console.log("Destroy fixtures...");
        return sqlFixtures.destroy();
    }
};
module.exports = Fixture;