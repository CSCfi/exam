(function() {
    'use strict';
    angular.module('sitnet.services')
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

            return { printExamDuration: printExamDuration };
        });
}());
