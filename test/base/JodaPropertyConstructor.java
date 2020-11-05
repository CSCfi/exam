package base;

import java.util.Date;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.yaml.snakeyaml.constructor.Construct;
import org.yaml.snakeyaml.constructor.Constructor;
import org.yaml.snakeyaml.nodes.Node;
import org.yaml.snakeyaml.nodes.NodeId;
import org.yaml.snakeyaml.nodes.Tag;

class JodaPropertyConstructor extends Constructor {

    JodaPropertyConstructor() {
        yamlClassConstructors.put(NodeId.scalar, new TimeStampConstruct());
    }

    class TimeStampConstruct extends Constructor.ConstructScalar {

        @Override
        public Object construct(Node nnode) {
            if (nnode.getTag() == Tag.TIMESTAMP) {
                Construct dateConstructor = yamlConstructors.get(Tag.TIMESTAMP);
                if (nnode.getType().isAssignableFrom(DateTime.class)) {
                    Date date = (Date) dateConstructor.construct(nnode);
                    return new DateTime(date, DateTimeZone.UTC);
                } else {
                    return dateConstructor.construct(nnode);
                }
            } else {
                return super.construct(nnode);
            }
        }
    }
}
