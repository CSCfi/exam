(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('DoExamController', ['$scope', '$routeParams', '$translate', '$http', 'SITNET_CONF', 'StudentExamRes', 'QuestionRes', 'dateService',
            function ($scope, $routeParams, $translate, $http, SITNET_CONF, StudentExamRes, QuestionRes, dateService) {

                $scope.sectionsBar = SITNET_CONF.TEMPLATES_PATH + "/student_sections_bar.html";

                var param1 = $routeParams.param1;
                console.log(param1);


                $scope.doExam = function(hash) {
                    $http.get('/student/doexam/'+$routeParams.hash)
                      .success(function(data, status, headers, config){
                        $scope.doexam = data;
                        $scope.activeSection = $scope.doexam.examSections[0];
                      }).
                      error(function(data, status, headers, config) {
                          // called asynchronously if an error occurs
                          // or server returns response with an error status.
                      });
                  }
                $scope.doExam();


                $scope.setActiveSection = function(section) {
                    $scope.activeSection = section;
                }

            }]);
}());