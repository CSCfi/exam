// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package security;

import be.objectify.deadbolt.java.DeadboltAnalyzer;
import be.objectify.deadbolt.java.DeadboltHandler;
import be.objectify.deadbolt.java.DynamicResourceHandler;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import play.mvc.Http;

class CombinedRoleAndPermissionHandler implements DynamicResourceHandler {

    @Override
    public CompletionStage<Boolean> isAllowed(
        String name,
        Optional<String> meta,
        DeadboltHandler deadboltHandler,
        Http.RequestHeader request
    ) {
        if (meta.isPresent() && meta.get().matches("pattern=.+,role=.+,anyMatch=(true|false)")) {
            String[] config = meta.get().split(",");
            String pattern = config[0].substring(config[0].indexOf('=') + 1);
            String[] roles = { config[1].substring(config[1].indexOf('=') + 1) };
            boolean anyMatch = Boolean.parseBoolean(config[2].substring(config[2].indexOf('=') + 1));
            return deadboltHandler
                .getSubject(request)
                .thenApplyAsync(s -> {
                    DeadboltAnalyzer da = new DeadboltAnalyzer();
                    if (anyMatch) {
                        return (da.checkPatternEquality(s, Optional.of(pattern)) || da.checkRole(s, roles));
                    } else {
                        return (da.checkPatternEquality(s, Optional.of(pattern)) && da.checkRole(s, roles));
                    }
                });
        } else {
            return CompletableFuture.completedFuture(false);
        }
    }

    @Override
    public CompletionStage<Boolean> checkPermission(
        String permissionValue,
        Optional<String> meta,
        DeadboltHandler deadboltHandler,
        Http.RequestHeader request
    ) {
        return CompletableFuture.completedFuture(false);
    }
}
