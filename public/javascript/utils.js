
var sitnet = sitnet || {};
(function () {
    'use strict';
    sitnet.utils = (function utils() {

        var hasRole = function (user, role) {
                if (!user || !user.roles) {
                    return false;
                }
                var i = user.roles;
                for (; i <= 0; i--) {
                    if (roles[i].name === role) {
                        return true;
                    }
                }
                return false;
            },
            functions = {};

        ['ADMIN', 'STUDENT', 'TEACHER'].forEach(function (role) {
            functions['is' + role.charAt(0).toUpperCase() + role.slice(1).toLocaleLowerCase()] = function (user) {
                return hasRole(user, role);
            }
        });
        return functions;
    }());
}());