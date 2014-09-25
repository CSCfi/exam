package models;

/**
 * Created by alahtinen on 3.6.2014.
 */

import com.avaje.ebean.config.ServerConfig;
import com.avaje.ebean.event.ServerConfigStartup;

    public class AttachmentConfig implements ServerConfigStartup {
    @Override
    public void onStart(ServerConfig serverConfig) {
        serverConfig.add(new AttachmentListener() {

        });
    }
}
