package base;

import com.avaje.ebean.config.ServerConfig;
import com.avaje.ebean.dbmigration.DdlGenerator;
import com.avaje.ebeaninternal.api.SpiEbeanServer;

public class DropAllDdlGenerator extends DdlGenerator {

    public DropAllDdlGenerator(SpiEbeanServer server, ServerConfig serverConfig) {
        super(server, serverConfig);
    }

    public String generateDropDdl() {
        return generateDropAllDdl();
    }
}
