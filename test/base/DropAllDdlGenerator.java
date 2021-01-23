package base;

import io.ebean.config.ServerConfig;
import io.ebeaninternal.api.SpiEbeanServer;
import io.ebeaninternal.dbmigration.DdlGenerator;

public class DropAllDdlGenerator extends DdlGenerator {

    public DropAllDdlGenerator(SpiEbeanServer server, ServerConfig serverConfig) {
        super(server, serverConfig);
    }

    public String generateDropDdl() {
        return generateDropAllDdl();
    }
}
