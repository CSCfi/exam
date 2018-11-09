/*
 * Copyright (c) 2018 Exam Consortium
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
import 'jquery-ui/ui/widgets/sortable';
import { Directive, ElementRef, EventEmitter, Input, NgZone, OnInit, Output } from '@angular/core';

// add jquery reference
declare var $: any;

@Directive({
    selector: '[appSortable]'
})
export class SortableDirective implements OnInit {
    @Input('appSortable') objects: any[];
    @Input() selection: string;
    @Output() onMove = new EventEmitter<any>();

    constructor(private el: ElementRef, private zone: NgZone) { }

    ngOnInit() {
        let startIndex = -1;

        this.zone.runOutsideAngular(() => {
            $(this.el.nativeElement).sortable({
                items: this.selection,
                start: (event, ui) => {
                    // on start we define where the item is dragged from
                    startIndex = ($(ui.item).index());
                },
                stop: (event, ui) => {
                    // on stop we determine the new index of the
                    // item and store it there
                    const newIndex = ($(ui.item).index());
                    const objToMove = this.objects[startIndex];
                    this.zone.run(() => {
                        this.objects.splice(startIndex, 1);
                        this.objects.splice(newIndex, 0, objToMove);
                        // we move items in the array, propagate update to angular as well
                        // since we're outside its lifecycle
                        this.onMove.emit({ object: objToMove, from: startIndex, to: newIndex });
                    });

                },
                axis: 'y'
            });
        });

        /* this.el.nativeElement.sortable({
            items: this.selection,
            start: (event, ui) => {
                // on start we define where the item is dragged from
                startIndex = ($(ui.item).index());
            },
            stop: (event, ui) => {
                // on stop we determine the new index of the
                // item and store it there
                const newIndex = ($(ui.item).index());
                const objToMove = this.objects[startIndex];
                this.objects.splice(startIndex, 1);
                this.objects.splice(newIndex, 0, objToMove);
                // we move items in the array, propagate update to angular as well
                // since we're outside its lifecycle
                this.onMove.emit({ object: objToMove, from: startIndex, to: newIndex });
            },
            axis: 'y'
        }); */
    }

}
