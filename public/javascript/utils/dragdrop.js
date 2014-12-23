(function() {

    "use strict";

    angular.module('sitnet.utils', [])

        .factory('DragDropHandler', [function() {
            return {
                dragObject: undefined,
                addObject: function(object, objects, to) {
                    objects.splice(to, 0, object);
                },
                moveObject: function(objects, from, to) {
                    objects.splice(to, 0, objects.splice(from, 1)[0]);
                }
            };
        }])

        .directive('draggable', ['DragDropHandler', function(DragDropHandler) {
            return {
                scope: {
                    draggable: '='
                },
                link: function(scope, element, attrs) {
                    element.draggable({
                        connectToSortable: attrs.draggableTarget,
                        helper: "clone",
                        revert: "invalid",
                        start: function() {
                            DragDropHandler.dragObject = scope.draggable;
                        },
                        stop: function() {
                            DragDropHandler.dragObject = undefined;
                        }
                    });

                    element.disableSelection();
                }
            };
        }])

        .directive('droppable', ['DragDropHandler', function(DragDropHandler) {
            return {
                scope: {
                    droppable: '=',
                    ngMove: '&',
                    ngCreate: '&'
                },
                link: function(scope, element, attrs) {
                    element.sortable({
                        connectWith: ['.draggable', '.sortable']
                    });
                    element.disableSelection();
                    element.on("sortdeactivate", function(event, ui) {
                        var from = (angular.element(ui.item).scope()) ? angular.element(ui.item).scope().$index : undefined;
                        var to = element.children().index(ui.item);

                        if (to >= 0 && (from != to || DragDropHandler.dragObject)) {
                            scope.$apply(function() {
                                if (from >= 0 && !DragDropHandler.dragObject) {
                                    //item is coming from this sortable
                                    scope.ngMove({from: from, to: to});
                                } else if (DragDropHandler.dragObject) {
                                    //item is dragged from elsewhere
                                    scope.ngCreate({
                                        object: DragDropHandler.dragObject,
                                        to: to
                                    });
                                    ui.item.remove();
                                }
                            });
                        }
                    });
                }
            };
        }]);

})();