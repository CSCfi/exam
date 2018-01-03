/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

angular.module('app.utility')
    .factory('DateTime', ['$translate', function ($translate) {

        var printExamDuration = function (exam) {

            if (exam && exam.duration) {
                var h = Math.floor(exam.duration / 60);
                var m = exam.duration % 60;
                if (h === 0) {
                    return m + " min";
                } else if (m === 0) {
                    return h + " h";
                } else {
                    return h + " h " + m + " min";
                }
            } else {
                return "";
            }
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
            getDateForWeekday: getDateForWeekday,
            getWeekdayNames: getWeekdayNames
        };
    }]);

