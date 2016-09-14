(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("QuestionRes", ['$resource', function ($resource) {
            return {
                questions: $resource("/app/questions/:id",
                    {
                        id: "@id"
                    },
                    {
                        "update": {method: "PUT"},
                        "delete": {method: "DELETE", params: {id: "@id"}},
                        "create": {method: "POST"}

                    }),

                questionOwner: $resource("/app/questions/owner/:uid",
                    {
                        uid: "@uid"
                    },
                    {
                        "update": {method: "POST"}
                    }),

                score: $resource("/app/review/examquestion/:id/score",
                    {
                        id: "@id"
                    },
                    {
                        "update": {method: "PUT", params: {id: "@id"}}
                    }),

                question: $resource("/app/question/:id",
                    {
                        id: "@id"
                    },
                    {
                        "copy": {method: "POST"}
                    }),

                questionlist: $resource("/app/questions")
            };
        }]);
}());
