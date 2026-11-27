// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.questions;

import io.ebean.annotation.EnumValue;

public enum QuestionType {
    @EnumValue("1")
    MultipleChoiceQuestion,
    @EnumValue("2")
    EssayQuestion,
    @EnumValue("3")
    WeightedMultipleChoiceQuestion,
    @EnumValue("4")
    ClozeTestQuestion,
    @EnumValue("5")
    ClaimChoiceQuestion,
}
