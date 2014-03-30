(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("ExamRes", ['$resource', function ($resource) {
            return {
                exams: $resource("/exams/:id", 
                {
                	id: "@id"
                },
                {
                    "update": {method: "PUT"},
                }),
                
                questions: $resource("/exams/:eid/section/:sid/question/:qid", 
                {
                	eid: "@eid", sid: "@sid", qid: "@qid"
                },
                {
                    "query":  {method: "GET"},
                    "get":    {method: "GET", params: {eid: "@eid"}},
                    "update": {method: "PUT"},
                    "insert": {method: "POST", params: { eid: "@eid" , sid: "@sid", qid: "@qid"}}
                }),
                
                sections: $resource("/exams/:eid/section/:sid",
                {
                    eid: "@eid", sid: "@sid"
                },
                {
                    "insertSection": {
                        method: "POST", params: { eid: "@eid" , sid: "@sid"}
                    }
                }),
                section: $resource("/section/:sectionId",
                {
                    sectionId: "@sectionId"
                },
                {
                    "deleteSection": {
                        method: "DELETE", params: { sectionId: "@sectionId"}
                    }

                }),
                
                userexams: $resource("/exams/user",
                {
                }),
                
                draft: $resource("/draft", null,
        		{
        		}),
 
        		events: $resource("/events/:examId",
                {
                    examId: "@examId"
                },
                {
                    "insertEvent": {
                        method: "POST", params: { examId: "@examId"}
                    }

                })
            }
        }]);
}());