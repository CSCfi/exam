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
                link: function(scope, element, attrs){
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
                link: function(scope, element, attrs){
                    element.sortable({
                        connectWith: ['.draggable','.sortable']
                    });
                    element.disableSelection();
                    element.on("sortdeactivate", function(event, ui) {
                        var from = (angular.element(ui.item).scope()) ? angular.element(ui.item).scope().$index : undefined;
                        var to = element.children().index(ui.item);
                        var list = element.attr('id');

                        if (to >= 0 ){
                            scope.$apply(function(){
                                if (from >= 0 && !DragDropHandler.dragObject) {
                                    //item is coming from a sortable
                                    if (!ui.sender || ui.sender[0] === element[0]) {
                                        //item is coming from this sortable
                                        DragDropHandler.moveObject(scope.droppable, from, to);
                                    } else {
                                        //item is coming from another sortable
                                        scope.ngMove({
                                            from: from,
                                            to: to,
                                            fromList: ui.sender.attr('id'),
                                            toList: list
                                        });
                                        ui.item.remove();
                                    }
                                } else {
                                    //item is coming from a draggable
                                    DragDropHandler.addObject(angular.copy(DragDropHandler.dragObject), scope.droppable, to);
                                    /*scope.$emit('add-draggable', {object: DragDropHandler.dragObject, to: to});
                                    scope.ngCreate({
                                        object: DragDropHandler.dragObject,
                                        to: to,
                                        list: list
                                    });*/
                                    ui.item.remove();
                                }
                            });
                        }
                    });
                }
            };
        }])

    ;})();