package controllers.base;

import org.webjars.play.WebJarsUtil;
import play.Environment;
import play.mvc.Controller;
import play.mvc.Result;

import javax.inject.Inject;

public class Index extends Controller {

    private final Environment environment;

    private final WebJarsUtil webJarsUtil;

    @Inject
    public Index(Environment environment, WebJarsUtil webJarsUtil) {
        this.environment = environment;
        this.webJarsUtil = webJarsUtil;
    }

    public Result index() {
        return ok(views.html.index.render(webJarsUtil, environment.isProd()));
    }
}
