/*
 * Copyright (c) 2018 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 *
 */

package backend.util;

import akka.stream.Attributes;
import akka.stream.FlowShape;
import akka.stream.Inlet;
import akka.stream.Outlet;
import akka.stream.stage.AbstractInHandler;
import akka.stream.stage.AbstractOutHandler;
import akka.stream.stage.GraphStage;
import akka.stream.stage.GraphStageLogic;
import akka.util.ByteString;
import scala.Tuple2;

public class ChunkMaker extends GraphStage<FlowShape<ByteString, ByteString>> {

    private final int chunkSize;

    public Inlet<ByteString> in = Inlet.create("ChunkMaker.in");
    public Outlet<ByteString> out = Outlet.create("ChunkMaker.out");
    private FlowShape<ByteString, ByteString> shape = FlowShape.of(in, out);

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
            private ByteString buffer = ByteString.empty();

            {
                setHandler(out, new AbstractOutHandler() {
                    @Override
                    public void onPull() {
                        emitChunk();
                    }
                });

                setHandler(in, new AbstractInHandler() {

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
                });
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