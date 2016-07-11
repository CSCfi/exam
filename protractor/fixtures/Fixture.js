var path = require('path');
var exec = require('child_process').execSync;


var Fixture = function () {


    this.addUser = function (id, email, last_name, first_name, password, lang) {
        
        exec('psql -U sitnet -d sitnet_protractor -c "INSERT INTO public.app_user (id, email, eppn, last_name, first_name, password, object_version, language_id) VALUES ' +
            '('+ id + ', ' + email + ', ' + email + ', ' + last_name + ', ' + first_name + ', ' + password  + ', 1, ' + lang + ');"');

        exec('psql -U sitnet -d sitnet_protractor -c "INSERT INTO public.app_user_role (app_user_id, role_id) VALUES (' + id + ', 3);"');
    };

    this.addQuestion = function (question_id, question, default_max_score, object_version, type, id) {

        exec('psql -U sitnet -d sitnet_protractor -c "INSERT INTO public.question (id, question, default_max_score, object_version, type) VALUES ' +
            '('+ id +', '+ question + ', ' + default_max_score + ','+ object_version +','+ type +');"');

        exec('psql -U sitnet -d sitnet_protractor -c "INSERT INTO public.question_owner (question_id, user_id) VALUES (' + question_id + ', ' + id + ');"');

    };

    this.addSection = function (section_id, creator_id, section_name, exam_id, lottery_item_count, object_version, sequence_number) {

        exec('psql -U sitnet -d sitnet_protractor -c "INSERT INTO public.exam_section (id, creator_id, name, exam_id, lottery_item_count, object_version, sequence_number) VALUES ' +
            '('+ section_id +',' + creator_id + ', '+ section_name + ', ' + exam_id + ','+ lottery_item_count +',' + object_version +','+ sequence_number +');"');
    };

    this.addSectionQuestion = function (section_id, question_id, sequence_number, section_question_id, creator_id, object_version) {

        exec('psql -U sitnet -d sitnet_protractor -c "INSERT INTO public.exam_section_question (exam_section_id, question_id, sequence_number, id, creator_id, object_version) VALUES ' +
            '('+ section_id +',' + question_id + ','+ sequence_number  + ','+ section_question_id + ',' + creator_id  + ',' + object_version + ');"');
    };
    
    this.addExam = function (exam_id, id, exam_name, object_version, execution_type_id, state) {

        exec('psql -U sitnet -d sitnet_protractor -c "INSERT INTO public.exam (id, creator_id, name,  object_version, execution_type_id, state) VALUES ' +
            '('+ exam_id +', '+ id + ', ' + exam_name + ','+ object_version +',' + execution_type_id +','+ state +');"');

        exec('psql -U sitnet -d sitnet_protractor -c "INSERT INTO public.exam_owner (exam_id, user_id) VALUES (' + exam_id + ', ' + id + ');"');
        
    };

    this.loadFixture = function () {

        exec('psql -U sitnet -d sitnet_protractor > tmp_dump.sql');

        var tmpscript = 'tmp_dump.sql';

        console.log('Loading fixtures...');
        exec('psql -U sitnet -d sitnet_protractor -f ' + path.resolve(__dirname, tmpscript),
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