// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.questions;

import io.ebean.annotation.EnumValue;

public enum ClaimChoiceOptionType {
    @EnumValue("1")
    CorrectOption,
    @EnumValue("2")
    IncorrectOption,
    @EnumValue("3")
    SkipOption,
}
