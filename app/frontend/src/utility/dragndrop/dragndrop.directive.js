/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */


require('jquery-ui');
require('jquery-ui/ui/widgets/droppable');
require('jquery-ui/ui/widgets/sortable');
require('jquery-ui/ui/disable-selection');

import toast from 'toastr';

angular.module('app.utility')

    .directive('sortable', [function () {
        return {
            restrict: 'A',
            scope: {
                onMove: '&',
                objects: '=',
                selection: '@selection'
            },
            link: function (scope, element, attrs) {
                let startIndex = -1;
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
                        const newIndex = ($(ui.item).index());
                        const objToMove = scope.objects[startIndex];
                        scope.objects.splice(startIndex, 1);
                        scope.objects.splice(newIndex, 0, objToMove);
                        // we move items in the array, propagate update to angular as well
                        // since we're outside its lifecycle
                        scope.onMove({object: objToMove, from: startIndex, to: newIndex});
                    },
                    axis: 'y'
                });
            }
        };
    }])

    .directive('droppable', ['$translate', '$parse', function ($translate, $parse) {
        return {
            scope: {
                objects: '=',
                identifier: '=',
                onMove: '&',
                onCreate: '&'
            },
            link: function (scope, element, attrs) {

                let startIndex = -1;

                attrs.$observe('dropDisabled', function () {
                    const dropDisabled = $parse(attrs.dropDisabled)(scope);
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
                                toast.error($translate.instant('sitnet_error_drop_disabled_lottery_on'));
                                event.revert = true;
                            }
                            if (!ui.draggable.hasClass('draggable') && !ui.draggable.hasClass('sortable-' + scope.identifier)) {
                                toast.warning($translate.instant('sitnet_move_between_sections_disabled'));
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
                            const newIndex = ($(ui.item).index());
                            const toMove = scope.objects[startIndex];
                            if (!toMove) {
                                event.revert = true;
                                return;
                            }
                            scope.objects.splice(startIndex, 1);
                            scope.objects.splice(newIndex, 0, toMove);

                            // we move items in the array, propagate update to angular as well
                            // since we're outside its digest
                            scope.onMove({from: startIndex, to: newIndex});
                        },
                        axis: 'y'
                    });

                    element.disableSelection();

                }
            }
        };
    }]);

