(function () {
    'use strict';
    angular.module('sitnet.services')
        .factory('examService', ['$translate', '$q', 'ExamRes', function ($translate, $q, ExamRes) {

            var refreshExamTypes = function() {
                var deferred = $q.defer();
                ExamRes.examTypes.query(function (examTypes) {
                    return deferred.resolve(examTypes.map(function(examType) {
                        switch (examType.type) {
                            case 'PARTIAL':
                                examType.name = $translate('sitnet_exam_credit_type_partial');
                                break;
                            case 'FINAL':
                                examType.name = $translate('sitnet_exam_credit_type_final');
                                break;
                            default:
                                toastr.error('Received unrecogined exam type from server!');
                                break;
                        }
                        return examType;
                    }));
                });
                return deferred.promise;
            };

            return { refreshExamTypes: refreshExamTypes };
        }]);
}());
