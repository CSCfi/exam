(function () {
    'use strict';
    angular.module('exam.services')
        .factory('dateService', function () {

            var printExamDuration = function (exam) {

                if (exam && exam.duration) {
                    var h = Math.floor(exam.duration / 60);
                    var m = exam.duration % 60;
                    if (h === 0) {
                        return m + "min";
                    } else if (m === 0) {
                        return h + "h ";
                    } else {
                        return h + "h " + m + "min";
                    }
                } else {
                    return "";
                }
            };

            var checkDST = function (stamp) {
                var date = moment(stamp, 'DD.MM.YYYY HH:mmZZ');
                var now = moment();
                if (date.isDST() && !now.isDST()) {
                    date = date.add(-1, 'hours');
                } else if (!date.isDST() && now.isDST()) {
                    date = date.add(1, 'hours');
                }
                return date;
            };

            return {
                printExamDuration: printExamDuration,
                checkDST: checkDST
            };
        });
}());
