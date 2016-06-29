var path = require('path');
var exec = require('child_process').execSync;

var Fixture = function () {

    this.loadFixture = function () {
        console.log('Loading fixtures...');
        exec('psql -U sitnet -d sitnet_protractor -f ' + path.resolve(__dirname, 'test_dump.sql'),
            {stdio: ['pipe', 'ignore', 'pipe']},
            function (error, stdout, stderr) {
                console.log('stdout: ', stdout);
                console.log('stderr: ', stderr);
                if (error !== null) {
                    console.log('exec error: ', error);
                }
            });
        console.log('Done')
    };
};
module.exports = Fixture;