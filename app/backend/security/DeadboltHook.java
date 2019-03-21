/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

package backend.security;

import java.util.List;

import be.objectify.deadbolt.java.cache.HandlerCache;
import com.google.common.collect.ImmutableList;
import com.typesafe.config.Config;
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
