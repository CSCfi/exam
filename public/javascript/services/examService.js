(function () {
    'use strict';
    angular.module('sitnet.services')
        .service('examService', [ '$rootScope', 'ExamRes',
            function ($rootScope, ExamRes) {

                var allReviewedExams = ExamRes.examsByState.query({state: 'REVIEW'});

                return {
                    allReviewedExams: allReviewedExams
                };
            }]);
}());