import { Directive, ElementRef, EventEmitter, Input, NgZone, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

@Directive({
    selector: '[appDroppable]',
})
export class DroppableDirective implements OnInit {
    @Input('appDroppable') objects: unknown[];
    @Input() identifier: string;
    @Output() onMove = new EventEmitter<{ from: number; to: number }>();
    @Output() onCreate = new EventEmitter<any>();

    constructor(private el: ElementRef, private zone: NgZone, private translate: TranslateService) {}

    ngOnInit(): void {
        let startIndex = -1;

        const initDroppable = (dropDisabled: boolean) => {
            this.el.nativeElement.droppable({
                drop: (event: unknown, ui: JQueryUI.DroppableEventUIParam) => {
                    if (dropDisabled) {
                        toast.error(this.translate.instant('sitnet_error_drop_disabled_lottery_on'));
                    } else if (
                        !ui.draggable.hasClass('draggable') &&
                        !ui.draggable.hasClass('sortable-' + this.identifier)
                    ) {
                        toast.warning(this.translate.instant('sitnet_move_between_sections_disabled'));
                    }
                },
            });

            this.el.nativeElement.sortable({
                disabled: dropDisabled,
                items: '.sortable-' + this.identifier,
                axis: 'y',
                start: (event: unknown, ui: JQueryUI.SortableUIParams) => {
                    startIndex = $(ui.item).index();
                },
                stop: (event: JQuery.Event, ui: JQueryUI.SortableUIParams) => {
                    const newIndex = $(ui.item).index();
                    const toMove = this.objects[startIndex];
                    if (!toMove) {
                        return;
                    }
                    this.objects.splice(startIndex, 1);
                    this.objects.splice(newIndex, 0, toMove);

                    // we move items in the array, propagate update to angular as well
                    // since we're outside its digest
                    this.onMove.emit({ from: startIndex, to: newIndex });
                },
            });

            this.el.nativeElement.disableSelection();
        };
        this.zone.runOutsideAngular(() => initDroppable);
    }
}
