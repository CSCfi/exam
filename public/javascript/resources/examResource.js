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
                    "remove": {method: "DELETE"}
                }),
                
                questions: $resource("/exams/:eid/section/:sid/question/:qid", 
                {
                	eid: "@eid", sid: "@sid", qid: "@qid"
                },
                {
                    "query":  {method: "GET"},
                    "get":    {method: "GET", params: {eid: "@eid"}},
                    "update": {method: "PUT"},
                    "insert": {method: "POST", params: { eid: "@eid" , sid: "@sid", qid: "@qid"}},
                    "remove": {method: "DELETE", params: { eid: "@eid" , sid: "@sid", qid: "@qid"}}
                }),

                sections: $resource("/exams/:eid/section/:sid",
                {
                    eid: "@eid", sid: "@sid"
                },
                {
                    "insert": {method: "POST", params: { eid: "@eid" , sid: "@sid"}},
                	"remove": {method: "DELETE", params: { eid: "@eid" , sid: "@sid"}},
                    "update": {method: "PUT", params: { eid: "@eid" , sid: "@sid"}}

                }),

                clearsection: $resource("/clearsection/:sid",
                {
                    sid: "@sid"
                },
                {
                	"clear": {method: "DELETE", params: {sid: "@sid"}}
                }),

                course: $resource("/exams/:eid/course/:cid",
                {
                    eid: "@eid", sid: "@cid"
                },
                {
                    "update": {method: "PUT", params: { eid: "@eid" , cid: "@cid"}}
                }),

                room: $resource("/exams/:eid/room/:rid",
                {
                    eid: "@eid", rid: "@rid"
                },
                {
                    "update": {method: "PUT", params: { eid: "@eid" , cid: "@cid"}}
                }),

                examType: $resource("/exams/:eid/examtype/:etid",
                {
                    eid: "@eid", etid: "@etid"
                },
                {
                    "insert": {method: "POST", params: { eid: "@eid", etid: "@etid" }}
                }),

                section: $resource("/section/:sectionId",
                {
                    sectionId: "@sectionId"
                },
                {
                    "deleteSection": {method: "DELETE", params: { sectionId: "@sectionId"}}
                }),

                examsByState: $resource("/exams/state/:state",
                {
                    state: "@state"
                }),

                activeExams: $resource("/activeexams", null,
                {
                }),

                reviewerExams: $resource("/reviewerexams", null,
                {
                }),

                finishedExams: $resource("/finishedexams", null,
                {
                }),

                draft: $resource("/draft", null,
        		{
        		}),

                review: $resource("/review/:id",
                {
                    id: "@id"
                },
                {
                    "update": {method: "PUT"}
                }),

                examReviews: $resource("/reviews/:eid",
                {
                    eid: "@eid"
                },
                {
                    "get": {method: "GET", params: { eid: "@eid" }}
                }),

                comment: $resource("/review/:eid/comment/:cid",
                {
                    id: "@eid", cid: "@cid"
                },
                {
                    "insert": {method: "POST", params: { eid: "@eid" }},
                    "update": {method: "PUT", params: { eid: "@eid" , sid: "@cid"}}
                
                }),

                inspections: $resource("/exam/:id/inspections",
                {
                    id: "@id"
                },
                {
                    "get": {method: "GET", params: { id: "@id" }}
                }),

                inspection: $resource("/exams/:eid/inspector/:uid",
                {
                    eid: "@eid", uid: "@uid"
                },
                {
                    "insert": {method: "POST", params: { eid: "@eid" , uid: "@uid"}},
                    "remove": {method: "DELETE", params: { eid: "@eid" , uid: "@uid"}},
                    "update": {method: "PUT", params: { eid: "@eid" , uid: "@uid"}}
                }),

                inspector: $resource("/exams/inspector/:id",
                {
                    id: "@id"
                },
                {
                    "remove": {method: "DELETE", params: { id: "@id"}}
                }),

                examEnrolments: $resource("/examenrolments/:eid",
                {
                    eid: "@eid"
                },
                {
                    "get": {method: "GET", params: { eid: "@eid" }}
                }),

                examParticipations: $resource("/examparticipations/:eid",
                {
                    eid: "@eid"
                },
                {
                    "get": {method: "GET", params: { eid: "@eid" }}
                }),

                studentInfo: $resource("/review/info/:id",
                {
                    id: "@id"
                })
            }
        }]);
}());