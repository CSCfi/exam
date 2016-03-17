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
            }
        }])

        .directive('droppable', ['DragDropHandler', '$translate', function (DragDropHandler, $translate) {
            return {
                scope: {
                    objects: '=',
                    identifier: '=',
                    onMove: '&',
                    onCreate: '&'
                },
                link: function (scope, element, attrs) {
                    var startIndex = -1;

                    element.droppable({
                        drop: function (event, ui) {
                            if (!ui.draggable.hasClass('draggable') && !ui.draggable.hasClass('sortable-' + scope.identifier)) {
                                toastr.warning($translate.instant('sitnet_move_between_sections_disabled'));
                            }
                        }
                    });

                    element.sortable({
                        items: '.sortable-' + scope.identifier,
                        start: function (event, ui) {
                            startIndex = ($(ui.item).index());
                        },
                        stop: function (event, ui) {
                            var newIndex = ($(ui.item).index());
                            var toMove = scope.objects[startIndex];
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
            };
        }]);

})();
