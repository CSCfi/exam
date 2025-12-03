// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package security;

import be.objectify.deadbolt.java.cache.HandlerCache;
import com.google.common.collect.ImmutableList;
import com.typesafe.config.Config;
import java.util.List;
import play.Environment;
import play.inject.Binding;
import play.inject.Module;

public class DeadboltHook extends Module {

    @Override
    public List<Binding<?>> bindings(Environment environment, Config config) {
        return ImmutableList.of(
            bindClass(AuthorizationHandler.class).toSelf().eagerly(),
            bindClass(HandlerCache.class).to(DeadboltCache.class).eagerly()
        );
    }
}
