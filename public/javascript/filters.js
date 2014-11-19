(function () {
    'use strict';
    angular.module('sitnet.filters')
        .filter('newlines', function (text) {
            return text.replace(/\n/g, '');
        })
        .filter('utc', function () {
            return function (val) {
                var date = new Date(val);
                return new Date(date.getUTCFullYear(),
                    date.getUTCMonth(),
                    date.getUTCDate(),
                    date.getUTCHours(),
                    date.getUTCMinutes(),
                    date.getUTCSeconds());
            };

        })
        .filter('striphtml', function() {
            return function(html) {
                var div = document.createElement("div");
                div.innerHTML = html;
                var text = div.textContent || div.innerText || "";
                return text.replace(/(^"|"$|\\n)/g,"").replace(/\s+/g, ' ').trim();
            };
        })
        .filter('wordcount', function() {
            return function(text) {
                return text.split(" ").length;
            };
        });
}());