(function () {
    'use strict';
    angular.module('exam.filters')
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
        .filter('truncate', function () {
            return function (text, after) {
                if (!text) return "";
                return truncate(text, after, {ellipsis: '...'});
            };
        })
        .filter('striphtml', function () {
            return function (html) {
                // test if mathjax formula
                if (html && html.indexOf("math-tex") === -1) {
                    var div = document.createElement("div");
                    div.innerHTML = html;
                    return div.textContent || div.innerText || "";
                }
                if (html === undefined) {
                    return "";
                }
                return html;
            };
        })
        .filter('charcount', function () {
            return function (text) {
                return text.replace(/(^"|"$|\\n)/g, "").replace(/\s+/g, ' ').trim().length;
            };
        })
        .filter('wordcount', function () {
            return function (text) {
                var words = text.replace(/(\S\.)(?!\s)/g, "$1 ").replace(/(^"|"$|\\n)/g, '').match(/\S+/g);
                return words ? words.length : 0;
            };
        })
        .filter('diffInMinutesTo', function () {
            var magicNumber = (1000 * 60);

            return function (fromDate, toDate) {
                if (toDate && fromDate) {
                    var diff = (new Date(toDate).getTime() - new Date(fromDate).getTime()) / magicNumber;
                    return Math.round(diff);
                }
            };
        })
        .filter('diffInDaysToNow', function () {
            var magicNumber = (1000 * 60 * 60 * 24);

            return function (fromDate) {
                if (fromDate) {
                    var diff = (new Date(fromDate).getTime() - new Date().getTime()) / magicNumber;
                    if (diff < 0) {
                        return '<span class="sitnet-text-alarm">' + Math.floor(diff) + '</span>';
                    }
                    return '<span>' + Math.floor(diff) + '</span>';
                }
            };
        })
        .filter('offset', function () {
            return function (input, start) {
                if (!input) return [];
                start = parseInt(start);
                return input.slice(start);
            }
        })
        .filter('pagefill', function () {
            return function (input, total, current, pageSize) {
                total = parseInt(total, 10);
                current = parseInt(current, 10);
                pageSize = parseInt(pageSize, 10);
                var pages = Math.floor(total / pageSize);
                if (pages > 0 && current === pages) {
                    var amount = (pages + 1) * pageSize - total;
                    for (var i = 0; i < amount; ++i) input.push(i);
                }
                return input;
            }
        })
        .filter('zeropad', function () {
            return function (input) {
                input += '';
                return input.length > 1 ? input : '0' + input;
            }
        })
        .filter('adjustdst', function () {
            return function (date) {
                if (moment(date).isDST()) {
                    date = moment(date).add(-1, 'hour').format();
                }
                return date;
            }
        });
}());
