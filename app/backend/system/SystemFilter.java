package backend.system;

import akka.stream.Materializer;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import javax.inject.Inject;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.Logger;
import play.mvc.Filter;
import play.mvc.Http;
import play.mvc.Result;

public class SystemFilter extends Filter {
    private static final Logger.ALogger logger = Logger.of(SystemFilter.class);

    @Inject
    public SystemFilter(Materializer mat) {
        super(mat);
    }

    private Result updateHeader(Result result, Http.Session session, String key, String header) {
        return session.get(key).isPresent()
            ? result.withHeader(header, session.get(key).get())
            : result.withoutHeader(header);
    }

    private Result processResult(Result src, Http.RequestHeader request) {
        Result response = src.withHeaders("Cache-Control", "no-cache;no-store", "Pragma", "no-cache");
        Http.Session session = response.session() != null ? response.session() : request.session();
        if (session == null) {
            return response.withNewSession();
        }
        if (!request.path().contains("checkSession") && !request.path().contains("logout")) { // update expiration
            session = session.adding("since", ISODateTimeFormat.dateTime().print(DateTime.now()));
        }
        response = updateHeader(response, session, "ongoingExamHash", "x-exam-start-exam");
        response = updateHeader(response, session, "upcomingExamHash", "x-exam-upcoming-exam");
        response = updateHeader(response, session, "wrongMachineData", "x-exam-wrong-machine");
        response = updateHeader(response, session, "wrongRoomData", "x-exam-wrong-room");
        return response.withSession(session);
    }

    @Override
    public CompletionStage<Result> apply(
        Function<Http.RequestHeader, CompletionStage<Result>> nextFilter,
        Http.RequestHeader requestHeader
    ) {
        if (requestHeader.path().startsWith("/app")) {
            AuditLogger.log(requestHeader);
            return nextFilter.apply(requestHeader).thenApply(result -> processResult(result, requestHeader));
        } else {
            return nextFilter.apply(requestHeader);
        }
    }
}
