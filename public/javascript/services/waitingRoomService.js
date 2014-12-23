(function() {
    'use strict';
    angular.module('sitnet.services')
        .factory('waitingRoomService', [function() {

            var enrolmentId;
            var actualRoom;
            var actualMachine;

            var setEnrolmentId = function(id) {
                enrolmentId = id;
            };

            var getEnrolmentId = function() {
                return enrolmentId;
            };

            var setError = function(error) {
                this.error = error;
            };

            var getActualRoom = function() {
                return actualRoom;
            };

            var setActualRoom = function(room) {
                actualRoom = room;
            };

            var getActualMachine = function() {
                return actualMachine;
            };

            var setActualMachine = function(machine) {
                actualMachine = machine;
            };
            return {
                setEnrolmentId: setEnrolmentId,
                getEnrolmentId: getEnrolmentId,
                setActualRoom: setActualRoom,
                getActualRoom: getActualRoom,
                setActualMachine: setActualMachine,
                getActualMachine: getActualMachine
            };
        }]);
}());
