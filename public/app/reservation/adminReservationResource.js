(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("AdminReservationResource", ['$resource', function ($resource) {
            return {
                reservationListing: $resource(
                    "/admin/reservations/list/:userId/:roomId/:examId",
                    {
                        userId: "@userId",
                        roomId: "@roomId",
                        examId: "@examId"
                    },
                    {
                        "query": {method: "GET", isArray:true, params: {userId: "userId", roomId: "roomId", examId: "examId"}}
                    }),
                reservationListingByStudent: $resource(
                    "/admin/reservations/list/student/:userId/:start/:end",
                    {
                        userId: "@userId",
                        start: "@start",
                        end: "@end"
                    },
                    {
                        "query": {method: "GET", isArray:true, params: {userId: "userId", start: "start", end: "end"}}
                    }),
                reservationListingByRoom: $resource(
                    "/admin/reservations/list/room/:roomId/:start/:end",
                    {
                        roomId: "@roomId",
                        start: "@start",
                        end: "@end"
                    },
                    {
                        "query": {method: "GET", isArray:true, params: {roomId: "roomId", start: "start", end: "end"}}
                    }),
                reservationListingByExam: $resource(
                    "/admin/reservations/list/exam/:examId/:start/:end",
                    {
                        examId: "@examId",
                        start: "@start",
                        end: "@end"
                    },
                    {
                        "query": {method: "GET", isArray:true, params: {examId: "examId", start: "start", end: "end"}}
                    }),


                reservationDeletion: $resource(
                    "/admin/reservations/delete/:id",
                    {
                        id: "@id"
                    },
                    {
                        "remove": {method: "DELETE", params: { id: "id"}}

                    }),
                students: $resource(
                    "/admin/students", null,
                    {

                    }),
                exams: $resource(
                    "/admin/exams", null,
                    {

                    }),
                examrooms: $resource(
                    "/admin/examrooms", null,
                    {

                    })
            }
        }]);
}());