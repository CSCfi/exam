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
                        "update": {method: "PUT", params: {id: "@id"}},
                        "delete": {method: "DELETE", params: {id: "@id"}},
                        "create": {method: "POST"}

                    }),

                questionOwner: $resource("/app/questions/owner/:uid",
                    {
                        uid: "@uid"
                    },
                    {
                        "update": {method: "POST"},
                        "remove": {method: "DELETE"}
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

                questionlist: $resource("/app/questions"),
                options: $resource("/app/questions/:qid/option/:oid",
                    {
                        qid: "@qid", oid: "@oid"
                    },
                    {
                        "update": {method: "PUT", params: {oid: "@oid"}},
                        "create": {method: "POST", params: {qid: "@qid"}},
                        "delete": {method: "DELETE", params: {oid: "@oid"}}
                    }),
                correctOption: $resource("/app/questions/correctoption/:oid",
                    {
                        oid: "@oid"
                    },
                    {
                        "update": {method: "PUT", params: {oid: "@oid"}}
                    })
            };
        }]);
}());
