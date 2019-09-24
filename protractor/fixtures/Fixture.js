const {Pool} = require('../../app/frontend/node_modules/pg');
const _ = require('../../app/frontend/node_modules/lodash');
const users = require('./users.json');
const courses = require('./courses.json');
const organisations = require('./organisations.json');
const questions = require('./questions.json');
const exams = require('./exams.json');

const Fixture = function () {

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
            const enumeration = [...Array(keys.length).keys()].map(k => '$' + (k + 1));
            const stmt = `INSERT INTO ${table} (${keyPart}) VALUES (${enumeration.join(', ')})`;
            return {
                text: stmt,
                values: Object.values(d)
            }
        })
    };

    this.loadFixtures = function (files) {
        const baseData = [users, courses, organisations, questions, exams];
        files = files || baseData;
        console.log("Loading fixtures from files: " + files);
        const data = files.reduce((a, b) => _.merge(a, b), {});
        const relations = Object.keys(data).map(k => ({'table': k, 'data': data[k]}));
        relations.forEach(r => pool.query(createQuery(r.table, r.data)));
    };

    this.clearFixtures = () =>
        ['app_user', 'exam', 'organisation', 'question', 'course']
            .forEach(t => pool.query(`truncate table ${t} cascade`));


    this.destroy = () => {
        console.log("Destroy fixtures...");
        client.end();
    }
};

module.exports = Fixture;
