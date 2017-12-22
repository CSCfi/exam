(function () {
    'use strict';
    angular.module('app.exam')
        .factory('StudentExamRes', ['$resource', function ($resource) {
            return {
                exams: $resource("/app/student/exams"),
                examInfo: $resource('/app/student/exam/:eid/info', {eid: '@eid'}),
                finishedExams: $resource('/app/student/finishedexams'),
                enrolments: $resource('/app/enrolments'),
                enrolment: $resource('/app/enrolments/:eid',
                    {
                        eid: '@eid'
                    },
                    {
                        'get': {method: 'GET', params: {eid: '@eid'}},
                        'update': {method: 'PUT', params: {eid: '@eid'}}
                    }),
                feedback: $resource('/app/feedback/exams/:eid',
                    {
                        eid: '@eid'
                    },
                    {
                        'get': {method: 'GET', params: {eid: '@eid'}}
                    }),
                scores: $resource('/app/feedback/exams/:eid/score', {eid: '@eid'}),
                teachers: $resource('/app/student/inspectors/exam/:id',
                    {
                        id: '@id'
                    },
                    {
                        'get': {method: 'GET', isArray: true, params: {id: '@id'}}
                    }),
                reservationInstructions: $resource('/app/student/exams/:id',
                    {
                        id: '@id'
                    },
                    {
                        'get': {method: 'GET', isArray: false, params: {id: '@id'}}
                    })
            };
        }]);
}());
