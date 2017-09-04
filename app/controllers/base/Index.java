package controllers.base;

import controllers.WebJarAssets;
import org.webjars.play.WebJarsUtil;
import play.Environment;
import play.mvc.Controller;
import play.mvc.Result;

import javax.inject.Inject;

public class Index extends Controller {

    @Inject
    protected Environment environment;

    @Inject
    WebJarsUtil webJarsUtil;

    public Result index() {
        return ok(views.html.index.render(webJarsUtil, environment.isProd()));
    }
}
