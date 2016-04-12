(function () {

    "use strict";

    angular.module('exam.services')

        .factory('DragDropHandler', [function () {
            return {
                dragObject: undefined,
                addObject: function (object, objects, to) {
                    objects.splice(to, 0, object);
                }
            };
        }])

        .directive('draggable', ['DragDropHandler', function (DragDropHandler) {
            return {
                scope: {
                    draggable: '='
                },
                link: function (scope, element, attrs) {
                    element.draggable({
                        connectToSortable: attrs.draggableTarget,
                        helper: "clone",
                        revert: "invalid",
                        appendTo: "body",
                        start: function () {
                            DragDropHandler.dragObject = scope.draggable;
                        },
                        stop: function () {
                            DragDropHandler.dragObject = undefined;
                        }
                    });

                    element.disableSelection();
                }
            };
        }])

        .directive('sortable', [function () {
            return {
                restrict: 'A',
                scope: {
                    onMove: '&',
                    objects: '=',
                    selection: '@selection'
                },
                link: function (scope, element, attrs) {
                    var startIndex = -1;
                    element.sortable({
                        items: scope.selection,
                        accept: 'section-handle',
                        start: function (event, ui) {
                            // on start we define where the item is dragged from
                            startIndex = ($(ui.item).index());
                        },
                        stop: function (event, ui) {
                            // on stop we determine the new index of the
                            // item and store it there
                            var newIndex = ($(ui.item).index());
                            var objToMove = scope.objects[startIndex];
                            scope.objects.splice(startIndex, 1);
                            scope.objects.splice(newIndex, 0, objToMove);
                            // we move items in the array, propagete update to angular as well
                            // since we're outside its lifecycle
                            scope.onMove({object: objToMove, from: startIndex, to: newIndex});
                        },
                        axis: 'y'
                    });
                }
            };
        }])

        .directive('droppable', ['DragDropHandler', '$translate', '$parse', function (DragDropHandler, $translate, $parse) {
            return {
                scope: {
                    objects: '=',
                    identifier: '=',
                    onMove: '&',
                    onCreate: '&'
                },
                link: function (scope, element, attrs) {

                    var startIndex = -1;

                    attrs.$observe('dropDisabled', function () {
                        var dropDisabled = $parse(attrs.dropDisabled)(scope);
                        initDroppable(scope, element, dropDisabled);
                    });

                    function initDroppable(scope, element, dropDisabled) {
                        element.droppable({
                            drop: function (event, ui) {
                                if (ui.draggable.hasClass('section-handle')) {
                                    event.revert = true;
                                    return;
                                }
                                if (dropDisabled) {
                                    toastr.error($translate.instant('sitnet_error_drop_disabled_lottery_on'));
                                    event.revert = true;
                                }
                                if (!ui.draggable.hasClass('draggable') && !ui.draggable.hasClass('sortable-' + scope.identifier)) {
                                    toastr.warning($translate.instant('sitnet_move_between_sections_disabled'));
                                    event.revert = true;
                                }
                            }
                        });

                        element.sortable({
                            disabled: dropDisabled,
                            items: '.sortable-' + scope.identifier,
                            start: function (event, ui) {
                                startIndex = ($(ui.item).index());
                            },
                            stop: function (event, ui) {
                                var newIndex = ($(ui.item).index());
                                var toMove = scope.objects[startIndex];
                                if (!toMove) {
                                    event.revert = true;
                                    return;
                                }
                                scope.objects.splice(startIndex, 1);
                                scope.objects.splice(newIndex, 0, toMove);

                                // we move items in the array, propagete update to angular as well
                                // since we're outside its lifecycle
                                scope.onMove({from: startIndex, to: newIndex});
                            },
                            axis: 'y'
                        });

                        element.disableSelection();

                        element.on("sortdeactivate", function (event, ui) {
                            var to = element.children().index(ui.item);
                            if (DragDropHandler.dragObject && to > -1) {
                                scope.$apply(function () {
                                    scope.onCreate({
                                        object: DragDropHandler.dragObject,
                                        to: to
                                    });
                                    ui.item.remove();
                                });
                            }
                        });
                    }
                }
            };
        }]);

})();
