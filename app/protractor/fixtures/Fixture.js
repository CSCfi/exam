const { Pool } = require('pg');
const _ = require('lodash');
const users = require('./users.js');
const courses = require('./courses.js');
const organisations = require('./organisations.js');
const questions = require('./questions.js');
const exams = require('./exams.js');

class Fixture {

    constructor() {
        this.pool = new Pool({
            user: 'sitnet',
            host: 'localhost',
            database: 'sitnet_protractor',
            password: 'sitnetsitnet',
            port: 5432,
        });
    }

    createQuery(table, data) {
        const keys = Object.keys(data[0]);
        return data.map(d => {
            const enumeration = [...Array(keys.length).keys()].map(k => '$' + (k + 1));
            const stmt = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${enumeration.join(', ')})`;
            return {
                text: stmt,
                values: Object.values(d)
            };
        });
    };

    async loadFixtures(options) {
        const files = [courses, organisations, questions, exams];
        if (options.userData) {
            files.unshift(users);
        }
        const data = files.reduce((a, b) => _.merge(a, b), {});
        const relations = Object.keys(data).map(k => ({ 'table': k, 'data': data[k] }));
        const queries = relations
            .map(r => this.createQuery(r.table, r.data))
            .reduce((a, b) => a.concat(b), []);
        for (const q of queries) {
            try {
                await this.pool.query(q);
            } catch (err) {
                console.log(err.stack)
            }
        }
    };

    async clearFixtures(options) {
        const tables = ['question_owner', 'question', 'exam_owner', 'exam', 'exam_execution_type', 'exam_type',
            'course', 'organisation'];
        if (options.userData) {
            tables.push(...['app_user_role', 'role', 'app_user', 'language']);
        }
        for (const t of tables) {
            try {
                await this.pool.query(`truncate table ${t} cascade`);
            } catch (err) {
                console.log(err.stack)
            }
        }
    }

    async destroy() {
        await this.pool.end();
    }
}

module.exports = Fixture;
