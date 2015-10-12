(function () {
    'use strict';
    angular.module('exam.services')
        .factory('dateService',  ['$translate', function ($translate) {

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

            var getDateForWeekday = function (ordinal) {
                var now = new Date();
                var distance = ordinal - now.getDay();
                return new Date(now.setDate(now.getDate() + distance));
            };

            var getWeekdayNames = function () {
                var lang = $translate.use();
                var locale = lang.toLowerCase() + "-" + lang.toUpperCase();
                var options = {weekday: 'short'};
                return [
                    getDateForWeekday(1).toLocaleDateString(locale, options),
                    getDateForWeekday(2).toLocaleDateString(locale, options),
                    getDateForWeekday(3).toLocaleDateString(locale, options),
                    getDateForWeekday(4).toLocaleDateString(locale, options),
                    getDateForWeekday(5).toLocaleDateString(locale, options),
                    getDateForWeekday(6).toLocaleDateString(locale, options),
                    getDateForWeekday(0).toLocaleDateString(locale, options)
                ];
            };

            return {
                printExamDuration: printExamDuration,
                checkDST: checkDST,
                getDateForWeekday: getDateForWeekday,
                getWeekdayNames: getWeekdayNames
            };
        }]);
}());
