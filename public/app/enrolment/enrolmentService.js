(function () {
    'use strict';
    angular.module('exam.services')
        .factory('enrolmentService', ['$translate', '$q', '$location', 'EnrollRes', function ($translate, $q, $location, EnrollRes) {

            var enroll = function(exam) {
                var deferred = $q.defer();
                EnrollRes.enroll.create({code: exam.course.code, id: exam.id},
                    function (exam) {
                        toastr.success($translate('sitnet_you_have_enrolled_to_exam') + '<br/>' + $translate('sitnet_remember_exam_machine_reservation'));
                        $location.path('/calendar/' + exam.id);
                        deferred.resolve();
                    },
                    function (error) {
                        toastr.error(error.data);
                        deferred.reject(error);
                    });
                return deferred.promise;
            };

            return {
                enroll: enroll
            };

        }]);
}());
