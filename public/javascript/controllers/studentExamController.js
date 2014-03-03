(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('StudentExamController', ['$scope', '$routeParams', '$translate', '$http', 'SITNET_CONF', 'StudentExamRes', 'QuestionRes', 'dateService',
            function ($scope, $routeParams, $translate, $http, SITNET_CONF, StudentExamRes, QuestionRes, dateService) {

                $scope.dateService = dateService;

                $scope.sectionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section.html";
                $scope.questionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section_question.html";
                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section_general.html";


                $scope.exams = StudentExamRes.query();

            }]);
}());