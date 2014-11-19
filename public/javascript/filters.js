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
                return div.textContent || div.innerText || "";
            };
        })
        .filter('charcount', function() {
            return function(text) {
                return text.replace(/(^"|"$|\\n)/g,"").replace(/\s+/g, ' ').trim().length;
            };
        })
        .filter('wordcount', function() {
            return function(text) {
                return text.replace(/(\S\.)(?!\s)/g, "$1 ").replace(/(^"|"$|\\n)/g, '').match(/\S+/g).length;
            };
        });
}());