(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('LanguageInspectionCtrl', ['$scope', '$translate', 'EXAM_CONF',
            function ($scope, $translate, EXAM_CONF) {

                $scope.enrollPath = EXAM_CONF.TEMPLATES_PATH + "enrolment/enroll.html";
                $scope.examPath = EXAM_CONF.TEMPLATES_PATH + "enrolment/exam.html";
                $scope.detailedInfoPath = EXAM_CONF.TEMPLATES_PATH + "enrolment/detailed_info.html";

                console.log('hello world');

            }]);
}());
