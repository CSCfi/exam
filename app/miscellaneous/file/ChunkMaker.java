// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.file;

import org.apache.pekko.stream.Attributes;
import org.apache.pekko.stream.FlowShape;
import org.apache.pekko.stream.Inlet;
import org.apache.pekko.stream.Outlet;
import org.apache.pekko.stream.stage.AbstractInHandler;
import org.apache.pekko.stream.stage.AbstractOutHandler;
import org.apache.pekko.stream.stage.GraphStage;
import org.apache.pekko.stream.stage.GraphStageLogic;
import org.apache.pekko.util.ByteString;
import scala.Tuple2;

public class ChunkMaker extends GraphStage<FlowShape<ByteString, ByteString>> {

    private final int chunkSize;

    public Inlet<ByteString> in = Inlet.create("ChunkMaker.in");
    public Outlet<ByteString> out = Outlet.create("ChunkMaker.out");
    private final FlowShape<ByteString, ByteString> shape = FlowShape.of(in, out);

    public ChunkMaker(int chunkSize) {
        this.chunkSize = chunkSize;
    }

    @Override
    public FlowShape<ByteString, ByteString> shape() {
        return shape;
    }

    @Override
    public GraphStageLogic createLogic(Attributes inheritedAttributes) {
        return new GraphStageLogic(shape) {
            private ByteString buffer = ByteString.emptyByteString();

            {
                setHandler(
                    out,
                    new AbstractOutHandler() {
                        @Override
                        public void onPull() {
                            emitChunk();
                        }
                    }
                );

                setHandler(
                    in,
                    new AbstractInHandler() {
                        @Override
                        public void onPush() {
                            ByteString elem = grab(in);
                            buffer = buffer.concat(elem);
                            emitChunk();
                        }

                        @Override
                        public void onUpstreamFinish() {
                            if (buffer.isEmpty()) {
                                completeStage();
                                return;
                            }

                            if (isAvailable(out)) {
                                emitChunk();
                            }
                        }
                    }
                );
            }

            private void emitChunk() {
                if (buffer.isEmpty() && isClosed(in)) {
                    completeStage();
                    return;
                }
                if (buffer.size() < chunkSize && !isClosed(in)) {
                    pull(in);
                    return;
                }
                Tuple2<ByteString, ByteString> split = buffer.splitAt(chunkSize);
                ByteString chunk = split._1();
                buffer = split._2();
                push(out, chunk);
            }
        };
    }
}
