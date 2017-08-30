package system.actors;

import akka.actor.UntypedActor;
import play.Logger;
import util.java.ExternalCourseHandler;

import javax.inject.Inject;

public class CourseUpdaterActor extends UntypedActor {

    private ExternalCourseHandler externalCourseHandler;

    @Inject
    public CourseUpdaterActor(ExternalCourseHandler externalCourseHandler) {
        this.externalCourseHandler = externalCourseHandler;
    }

    @Override
    public void onReceive(Object message) throws Exception {
        Logger.debug("{}: Running course updater ...", getClass().getCanonicalName());
        externalCourseHandler.updateCourses().thenApplyAsync(x -> {
            Logger.debug("... {}: Done", getClass().getCanonicalName());
            return null;
        });
    }


}




