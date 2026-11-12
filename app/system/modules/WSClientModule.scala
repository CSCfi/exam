// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.modules

import play.api.inject.{SimpleModule, bind}
import play.api.libs.ws.ahc.{AsyncHttpClientProvider, StandaloneWSClientProvider}
import play.api.libs.ws.{StandaloneWSClient, WSClient}
import play.shaded.ahc.org.asynchttpclient.AsyncHttpClient
import services.iop.IopAwareWSClientProvider

/** Replaces Play's `AhcWSModule` (disabled in application.conf) with the same bindings, except that
  * WSClient adds the IOP protocol headers to requests addressed to XM.
  */
class WSClientModule
    extends SimpleModule(
      bind[AsyncHttpClient].toProvider[AsyncHttpClientProvider],
      bind[StandaloneWSClient].toProvider[StandaloneWSClientProvider],
      bind[WSClient].toProvider[IopAwareWSClientProvider]
    )
