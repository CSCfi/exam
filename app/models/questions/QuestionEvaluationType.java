// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.questions;

import io.ebean.annotation.EnumValue;

public enum QuestionEvaluationType {
    @EnumValue("1")
    Points,
    @EnumValue("2")
    Selection,
}
