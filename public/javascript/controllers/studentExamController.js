(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('StudentExamController', ['$scope', '$http', '$modal', '$window', 'SITNET_CONF', 'StudentExamRes',
            function ($scope, $http, $modal, $window, SITNET_CONF, StudentExamRes) {

                $scope.sectionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section.html";
                $scope.questionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section_question.html";
                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section_general.html";

                $scope.exams = StudentExamRes.query();

                $scope.exam = null;


                $scope.activateExam = function (exam) {
                    $scope.exam = exam;
                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/terms_of_use.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: "ModalInstanceCtrl"
                    });

                    modalInstance.result.then(function () {
                        // Todo: Make it work with angular style
//                        $http.get('#/student/doexam/'+$scope.exam.hash);
                        $window.location = '#/student/doexam/'+$scope.exam.hash;
                    }, function () {
//                        $console.log('Modal dismissed at: ' + new Date());
                    });
                };
            }]);
}());