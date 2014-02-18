(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('CourseCtrl', ['$scope', 'CourseRes', function ($scope, CourseRes) {

            $scope.courses = CourseRes.query();


        }]);
})();