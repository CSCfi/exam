(function() {
    'use strict';
    angular.module('sitnet.services')
        .factory('waitingRoomService', [function() {

            var enrolmentId;
            var examHash;

            var setEnrolmentId = function(id) {
                enrolmentId = id;
            };

            var getEnrolmentId = function() {
                return enrolmentId;
            };

            var setExamHash = function(hash) {
                examHash = hash;
            };

            var getExamHash = function() {
                return examHash;
            };

            return {
                setEnrolmentId: setEnrolmentId,
                getEnrolmentId: getEnrolmentId,
                getExamHash: getExamHash,
                setExamHash: setExamHash
            };
        }]);
}());
