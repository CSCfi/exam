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

import * as angular from 'angular';
import * as toast from 'toastr';
import { IScope, IAttributes } from 'angular';

interface SortableScope extends IScope {
    onMove: (x: any) => void;
    objects: any[];
    selection: any;
}

export class SortableDirective implements angular.IDirective<SortableScope> {
    restrict = 'A';
    link = (scope: SortableScope, element: angular.IAugmentedJQuery, attrs: IAttributes) => {
        let startIndex = -1;
        element.sortable({
            items: scope.selection,
            start: (event, ui) => {
                // on start we define where the item is dragged from
                startIndex = ($(ui.item).index());
            },
            stop: (event, ui) => {
                // on stop we determine the new index of the
                // item and store it there
                const newIndex = ($(ui.item).index());
                const objToMove = scope.objects[startIndex];
                scope.objects.splice(startIndex, 1);
                scope.objects.splice(newIndex, 0, objToMove);
                // we move items in the array, propagate update to angular as well
                // since we're outside its lifecycle
                scope.onMove({ object: objToMove, from: startIndex, to: newIndex });
            },
            axis: 'y'
        });
    }
}

export class DraggableModal implements angular.IDirective {
    restrict = 'A';
    link = (scope: IScope, element: angular.IAugmentedJQuery, attrs: IAttributes) => {
        element.draggable({
            revert: false,
            drag: function () {
                element.css('height', 'auto');
            }
        });
    }
}

interface DroppableScope extends angular.IScope {
    objects: any[];
    identifier: string;
    onMove: (x: any) => void;
    onCreate: (x: any) => void;
}

export class DroppableDirective implements angular.IDirective<DroppableScope> {

    restrict = 'A';

    static get $inject() {
        return ['$parse', '$translate'];
    }
    constructor(
        private $parse: angular.IParseService,
        private $translate: angular.translate.ITranslateService
    ) { }

    link = (scope: DroppableScope, element: angular.IAugmentedJQuery, attrs: IAttributes) => {
        let startIndex = -1;

        const initDroppable = (scope, element, dropDisabled) => {
            element.droppable({
                drop: function (event, ui) {
                    if (ui.draggable.hasClass('section-handle')) {
                        event.revert = true;
                        return;
                    }
                    if (dropDisabled) {
                        toast.error(this.$translate.instant('sitnet_error_drop_disabled_lottery_on'));
                        event.revert = true;
                    }
                    if (!ui.draggable.hasClass('draggable') &&
                        !ui.draggable.hasClass('sortable-' + scope.identifier)) {
                        toast.warning(this.$translate.instant('sitnet_move_between_sections_disabled'));
                        event.revert = true;
                    }
                }
            });

            element.sortable({
                disabled: dropDisabled,
                items: '.sortable-' + scope.identifier,
                axis: 'y',
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
                    scope.onMove({ from: startIndex, to: newIndex });
                },
            });

            element.disableSelection();

        };

        attrs.$observe('dropDisabled', function () {
            const dropDisabled = this.$parse(attrs.dropDisabled)(scope);
            initDroppable(scope, element, dropDisabled);
        });

    }
}
