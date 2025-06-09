// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.user;

import io.ebean.ExpressionList;

public class UserHandlerImpl implements UserHandler {

    public <T> ExpressionList<T> applyNameSearch(String prefix, ExpressionList<T> query, String filter) {
        var result = query;
        var rawFilter = filter.replaceAll(" +", " ").trim();
        var condition = String.format("%%%s%%", rawFilter);
        var fnField = prefix == null ? "firstName" : String.format("%s.firstName", prefix);
        var lnField = prefix == null ? "lastName" : String.format("%s.lastName", prefix);
        if (rawFilter.contains(" ")) {
            // Possible that user provided us two names. Let's try out some combinations of first and last names
            var name1 = rawFilter.split(" ")[0];
            var name2 = rawFilter.split(" ")[1];
            result = result
                .or()
                .and()
                .ilike(fnField, String.format("%%%s%%", name1))
                .ilike(lnField, String.format("%%%s%%", name2))
                .endAnd()
                .and()
                .ilike(fnField, String.format("%%%s%%", name2))
                .ilike(lnField, String.format("%%%s%%", name1))
                .endAnd()
                .endOr();
        } else {
            result = result.ilike(fnField, condition).ilike(lnField, condition);
        }
        return result;
    }
}
