package base;

import io.ebean.config.ServerConfig;
import io.ebean.dbmigration.DdlGenerator;
import io.ebeaninternal.api.SpiEbeanServer;

public class DropAllDdlGenerator extends DdlGenerator {

    public DropAllDdlGenerator(SpiEbeanServer server, ServerConfig serverConfig) {
        super(server, serverConfig);
    }

    public String generateDropDdl() {
        return generateDropAllDdl();
    }
}
