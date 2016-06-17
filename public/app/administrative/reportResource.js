(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("ReportResource", ['$resource', function ($resource) {
            return {
                resbydate: $resource(
                    "/app/statistics/resbydate/:roomId/:from/:to",
                    {
                        id: "@roomId",
                        from: "@from",
                        to: "@to"
                    },
                    {
                        "get": {method: "GET", params: {id: "@roomId", from: "@from", to: "@to"}}
                    }),
                examnames: $resource(
                    "/app/statistics/examnames", null,
                    {}),
                reviewsByDate: $resource(
                    "/app/statistics/reviewsbydate/:from/:to",
                    {
                        from: "@from",
                        to: "@to"
                    },
                    {
                        "get": {method: "GET", params: {from: "@from", to: "@to"}}
                    }),
                teacherExamsByDate: $resource(
                    "/app/statistics/teacherexamsbydate/:uid/:from/:to",
                    {
                        uid: "@uid",
                        from: "@from",
                        to: "@to"
                    },
                    {
                        "get": {method: "GET", params: {uid: "@uid", from: "@from", to: "@to"}}
                    }),
                departments: $resource("/app/reports/departments"),
                exams: $resource("/app/reports/exams"),
                reservations: $resource("/app/reports/reservations"),
                responses: $resource("/app/reports/responses"),
                participations: $resource("/app/reports/participations", {}, {
                    find: {
                        method: 'GET',
                        isArray: false,
                        interceptor: {
                            response: function(response) {
                                return response.data;
                            }
                        }
                    }
                })
            };
        }]);
}());
