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

        .directive('droppable', ['DragDropHandler', '$translate', function (DragDropHandler, $translate) {
            return {
                scope: {
                    identifier: '=',
                    droppable: '=',
                    ngMove: '&',
                    ngCreate: '&'
                },
                link: function (scope, element, attrs) {

                    // variables used for dnd
                    var toUpdate;
                    var startIndex = -1;
                    scope.$watch('droppable', function (value) {
                        toUpdate = value;
                    }, true);

                    element.droppable({
                        drop: function (event, ui) {
                            if (!ui.draggable.hasClass('draggable') && !ui.draggable.hasClass('sortable-' + scope.identifier)) {
                                toastr.warning($translate.instant('sitnet_move_between_sections_disabled'));
                            }
                        }
                    });

                    // use jquery to make the element sortable. This is called
                    // when the element is rendered
                    element.sortable({
                        items: '.sortable-' + scope.identifier,
                        start: function (event, ui) {
                            // on start we define where the item is dragged from
                            startIndex = ($(ui.item).index());
                        },
                        stop: function (event, ui) {
                            // on stop we determine the new index of the
                            // item and store it there
                            var newIndex = ($(ui.item).index());
                            var toMove = toUpdate[startIndex];
                            toUpdate.splice(startIndex, 1);
                            toUpdate.splice(newIndex, 0, toMove);

                            // we move items in the array, propagete update to angular as well
                            // since we're outside angulars lifecycle
                            scope.ngMove({from: startIndex, to: newIndex});
                        },
                        axis: 'y'
                    });

                    element.disableSelection();
                    element.on("sortdeactivate", function (event, ui) {
                        var to = element.children().index(ui.item);
                        if (DragDropHandler.dragObject && to > -1) {
                            scope.$apply(function () {
                                scope.ngCreate({
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
