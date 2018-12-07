let path = require('path');
let sqlFixtures = require('../../app/frontend/node_modules/sql-fixtures');
let fs = require('fs');
let mergeJSON = require('../../app/frontend/node_modules/merge-json');

let Fixture = function () {

    let baseData = ['users.json', 'courses.json', 'organisations.json', 'questions.json', 'exams.json'];

    let dbConfig = {
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
        let data = {};
        for (let i=0; i < files.length; i++) {
            let p = path.resolve(__dirname, files[i]);
            data = mergeJSON.merge(data, JSON.parse(fs.readFileSync(p, 'utf8')));
        }
        return sqlFixtures.create(dbConfig, data);
    };

    this.clearFixtures = function () {
        let tables = ['app_user', 'exam', 'organisation', 'question', 'course'];
        console.log("Clearing fixtures from tables: " + tables);
        let queries = [];
        for (let i = 0; i < tables.length; i++) {
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