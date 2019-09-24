let path = require('path');
let sqlFixtures = require('../../app/frontend/node_modules/sql-fixtures');
const {Pool} = require('../../app/frontend/node_modules/pg');
const _ = require('../../app/frontend/node_modules/lodash');
const users = require('./users.json');
const courses = require('./courses.json');
const organisations = require('./organisations.json');
const questions = require('./questions.json');
const exams = require('./exams.json');

let fs = require('fs');
let mergeJSON = require('../../app/frontend/node_modules/merge-json');

let Fixture = async function () {

    const baseData = [users, courses, organisations, questions, exams];

    const pool = new Pool({
        user: 'sitnet',
        host: 'localhost',
        database: 'sitnet_protractor',
        password: 'sitnetsitnet',
        port: 5432,
    });

    const createQuery = (table, data) => {
        const keys = Object.keys(data[0]);
        const keyPart = keys.join(',');
        return data.map(d => {
            let enumeration = [...Array(keys.length).keys()].map(k => '$' + (k + 1));
            let stmt = `INSERT INTO ${table} (${keyPart}) VALUES (${enumeration.join(', ')})`;
            return {
                text: stmt,
                values: Object.values(d)
            }
        })
    };

    this.loadFixtures = function (files) {
        files = files || baseData;
        console.log("Loading fixtures from files: " + files);
        const data = files.reduce((a, b) => _.merge(a, b), {});
        const relations = Object.keys(data).map(k => ({'table': k, 'data': data[k]}));
        relations.forEach(r => {
            pool.query(createQuery(r.table, r.data));
        });
    };

    this.clearFixtures = function () {
        let tables = ['app_user', 'exam', 'organisation', 'question', 'course'];
        console.log("Clearing fixtures from tables: " + tables);
        let queries = [];
        for (let i = 0; i < tables.length; i++) {
            queries.push('truncate table ' + tables[i] + ' cascade');
        }
        queries.forEach(q => pool.query(q));
    };

    this.destroy = async function () {
        console.log("Destroy fixtures...");
        await client.end();
    }
};
module.exports = Fixture;
