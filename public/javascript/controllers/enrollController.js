(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('EnrollController', ['$scope', 'EnrollRes', '$routeParams', 'SITNET_CONF', '$location',
                                 function ($scope, EnrollRes, $routeParams, SITNET_CONF, $location) {
        	
            $scope.enrollPath = SITNET_CONF.TEMPLATES_PATH + "student/enroll.html";

        	
        	
        	$scope.exams;
        	
            if($routeParams.code === undefined) {
            	console.log($routeParams.code);
            
            }
            else if($routeParams.code && $routeParams.id) {
            	
            	EnrollRes.enroll.get({code: $routeParams.code, id: $routeParams.id}, 
                        function (exam) {
                            
                            $scope.exam = exam;
                        }, 
                        function (error) {
                            toastr.error(error.data);
                        });
            }
            else if($routeParams.code) {
            	EnrollRes.list.get({code: $routeParams.code}, 
                function (exams) {
                    
                    $scope.exams = exams;
                }, 
                function (error) {
                    toastr.error(error.data);
                });
            }
            
            $scope.enrollExam = function (exam) {
            	EnrollRes.enroll.create({code: exam.course.code, id: exam.id}, 
                        function (exam) {
            		
                    		toastr.success("Olet ilmoittautunut tenttiin<br>Muista varata tenttikone");
                    		$location.path('#/home');
                        }, 
                        function (error) {
                            toastr.error(error.data);
                        });
            }
            
        }]);
}());