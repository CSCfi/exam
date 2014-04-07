'use strict';

angular.module('mgcrea.jquery', [])

    .provider('dimensions', function() {

        this.fn = angular.element.prototype;
        this.$get = function() {
            return this.fn;
        };

        this.fn.offset = function() {
            // if(!this) return;
            var el = this instanceof HTMLElement ? this : this[0];
            var box = el.getBoundingClientRect();
            var docElem = el.ownerDocument.documentElement;
            return {
                top: box.top + window.pageYOffset - docElem.clientTop,
                left: box.left + window.pageXOffset - docElem.clientLeft
            };
        };

        this.fn.height = function(outer) {
            var el = this instanceof HTMLElement ? this : this[0];
            var computedStyle = window.getComputedStyle(el);
            var value = el.offsetHeight;
            if(outer) {
                value += parseFloat(computedStyle.marginTop) + parseFloat(computedStyle.marginBottom);
            } else {
                value -= parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom) + parseFloat(computedStyle.borderTopWidth) + parseFloat(computedStyle.borderBottomWidth);
            }
            return value;
        };

        this.fn.width = function(outer) {
            var el = this instanceof HTMLElement ? this : this[0];
            var computedStyle = window.getComputedStyle(el);
            var value = el.offsetWidth;
            if(outer) {
                value += parseFloat(computedStyle.marginLeft) + parseFloat(computedStyle.marginRight);
            } else {
                value -= parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight) + parseFloat(computedStyle.borderLeftWidth) + parseFloat(computedStyle.borderRightWidth);
            }
            return value;
        };

    })

    .constant('debounce', function(fn, wait) {
        var timeout, result;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                result = fn.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            return result;
        };
    })

    .provider('jQuery', function() {

        var self = this;
        var jQLite = angular.element;

        this.$get = function() {
            return function jQuery(query) {
                var el = query instanceof HTMLElement ? query : document.querySelectorAll(query);
                return jQLite(el);
            };
        };

    });