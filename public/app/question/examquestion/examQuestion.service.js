'use strict';
angular.module('app.question')
    .service('ExamQuestion', ['$resource', function ($resource) {

        var self = this;

        self.undistributionApi = $resource('/app/examquestions/undistributed/:id',
            {
                id: '@id'
            },
            {
                'update': {method: 'PUT', params: {id: '@id'}}
            });

        self.distributionApi = $resource('/app/examquestions/distributed/:id',
            {
                id: '@id'
            },
            {
                'update': {method: 'PUT', params: {id: '@id'}}
            });

    }]);
