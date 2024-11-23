// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Dictionary } from './model';

// Had to setup our own translation infrastructure like this because
// the preferred .po files aren't caught up by CKE's translation engine.
// Probably because there is no loader for those in Angular so they aren't
// bundled.
const dictionary: Dictionary = {
    toolbarLabel: 'Lucktest',
    answerLabel: 'Rätt svar',
    caseSensitiveLabel: 'Stora och små bokstäver olika',
    caseSensitiveTip: 'Är det skillnad mellan stor och liten bokstav (gäller endast svar i textform)',
    numericLabel: 'Numeriskt svar',
    numericError: 'Svaret måste ha ett numeriskt värde',
    precisionLabel: 'Krav på svarets precision',
    precisionTip: '(± av värdet på det korrekta svaret)',
    save: 'Spara',
    cancel: 'Avbryt',
    usage: `Använd vertikalt steck ( | ) för att skilja korrekta svar från varandra. Använd asterisk 
            ( * ) om vilken som helst serie av tecken duger. Till exempel '*skepp|båt|färja' betyder 
            att  "skepp", "flaggskepp", "båt" och "färja" skulle duga som korrekta svar. Om du vill 
            att svaret de facto innehåller antingen en asterisk eller ett vertikalt streck så bör ett 
            sådant tecken föregås av enkel apostrof: ( \\ )`,
};
export default dictionary;
