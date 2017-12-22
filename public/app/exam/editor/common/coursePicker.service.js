'use strict';
angular.module('app.exam')
    .service('Course', ['$resource',
        function ($resource) {

            var self = this;

            self.courseApi = $resource('/app/courses');


        }]);
