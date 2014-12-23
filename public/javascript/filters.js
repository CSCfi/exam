(function() {
    'use strict';
    angular.module('sitnet.filters')
        .filter('newlines', function(text) {
            return text.replace(/\n/g, '');
        })
        .filter('utc', function() {
            return function(val) {
                var date = new Date(val);
                return new Date(date.getUTCFullYear(),
                    date.getUTCMonth(),
                    date.getUTCDate(),
                    date.getUTCHours(),
                    date.getUTCMinutes(),
                    date.getUTCSeconds());
            };

        })
        .filter('truncate', function() {
            return function(text, after) {
                return text.substring(0, after) + "...";
            };
        })
        .filter('striphtml', function() {
            return function(html) {
                if (html == undefined) {
                    return "";
                }
                var div = document.createElement("div");
                div.innerHTML = html;
                return div.textContent || div.innerText || "";
            };
        })
        .filter('charcount', function() {
            return function(text) {
                return text.replace(/(^"|"$|\\n)/g, "").replace(/\s+/g, ' ').trim().length;
            };
        })
        .filter('wordcount', function() {
            return function(text) {
                var words = text.replace(/(\S\.)(?!\s)/g, "$1 ").replace(/(^"|"$|\\n)/g, '').match(/\S+/g);
                return words ? words.length : 0;
            };
        });
}());