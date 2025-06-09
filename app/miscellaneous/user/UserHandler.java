// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.user;

import com.google.inject.ImplementedBy;
import io.ebean.ExpressionList;

@FunctionalInterface
@ImplementedBy(UserHandlerImpl.class)
public interface UserHandler {
    <T> ExpressionList<T> applyNameSearch(String prefix, ExpressionList<T> query, String filter);
}
