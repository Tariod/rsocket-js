import {
  RequestChannelRequesterStream,
  RequestChannelResponderStream,
} from "./RequestChannelStream";
import {
  RequestFnFRequesterHandler,
  RequestFnfResponderHandler,
} from "./RequestFnFStream";
import {
  RequestResponseRequesterStream,
  RequestResponseResponderStream,
} from "./RequestResponseStream";
import {
  RequestStreamRequesterStream,
  RequestStreamResponderStream,
} from "./RequestStreamStream";
import { Closeable } from "./Common";
import {
  Cancellable,
  ExtensionSubscriber,
  Payload,
  RSocket,
  SocketAcceptor,
  StreamFrameHandler,
  StreamLifecycleHandler,
  StreamsRegistry,
  Subscriber,
  Subscription,
} from "./RSocket";
import {
  DuplexConnection,
  FlowControl,
  FlowControlledFrameHandler,
  FrameHandler,
  Outbound,
} from "./Transport";
import {
  ErrorFrame,
  Frame,
  FrameTypes,
  KeepAliveFrame,
  LeaseFrame,
  MetadataPushFrame,
  RequestChannelFrame,
  RequestFnfFrame,
  RequestResponseFrame,
  RequestStreamFrame,
  ResumeFrame,
  ResumeOkFrame,
  SetupFrame,
} from "./Frames";

export class ClientServerInputMultiplexerDemultiplexer
  implements Closeable, StreamsRegistry, FlowControlledFrameHandler {
  private done: boolean;
  private registry: { [id: number]: StreamFrameHandler } = {};

  private delegateHandler: FlowControlledFrameHandler;

  constructor(
    private isServer: boolean,
    private keepAliveHandler: (frame: Frame, outbound: Outbound) => void,
    private connection: DuplexConnection,
    private fragmentSize: number,
    private streamIdSupplier: (occupiedIds: Array<number>) => number,
    handlers: { [requestType: number]: any },
    socketAcceptor?: SocketAcceptor
  ) {
    this.delegateHandler = isServer
      ? new SetupFrameHandler(
          socketAcceptor,
          this,
          this.connection,
          this.fragmentSize
        )
      : new GenericFrameHandler(
          new RequestFrameHandler(
            this,
            this.connection,
            this.fragmentSize,
            handlers
          ),
          new ConnectionFrameHandler(this, handlers),
          this
        );

    connection.handle(this);
  }

  handle(frame: Frame, callback?: (controlRequest: FlowControl) => void): void {
    this.delegateHandler.handle(frame, callback);
  }

  get(streamId: number): StreamFrameHandler {
    return this.registry[streamId];
  }

  add(stream: StreamFrameHandler & StreamLifecycleHandler): void {
    if (this.done) {
      stream.handleReject(new Error("Already closed"));
      return;
    }

    const registry = this.registry;
    const streamId = this.streamIdSupplier(
      (Object.keys(registry) as any) as Array<number>
    );

    this.registry[streamId] = stream;

    if (
      !stream.handleReady(streamId, {
        outbound: this.connection,
        fragmentSize: this.fragmentSize,
      })
    ) {
      // TODO: return stream id
    }
  }

  remove(stream: StreamFrameHandler): void {
    delete this.registry[stream.streamId];
  }

  close(error?: Error): void {
    if (this.done) {
      console.warn(
        `Trying to close for the second time. ${
          error ? `Dropping error [${error}].` : ""
        }`
      );
      return;
    }

    for (const streamId in this.registry) {
      const stream = this.registry[streamId];

      stream.close(
        new Error(`Closed. ${error ? `Original cause [${error}].` : ""}`)
      );
    }

    this.done = true;

    this.connection.close(error);
  }

  onClose(callback): void {
    this.connection.onClose(callback);
  }
}

class RequestFrameHandler implements FrameHandler {
  constructor(
    private registry: StreamsRegistry,
    private outbound: Outbound,
    private fragmentSize: number,
    private handlers: { [requestType: number]: any }
  ) {}

  handle(
    frame:
      | RequestFnfFrame
      | RequestResponseFrame
      | RequestStreamFrame
      | RequestChannelFrame
  ): void {
    switch (frame.type) {
      case FrameTypes.REQUEST_FNF:
        if (this.handlers[FrameTypes.REQUEST_FNF]) {
          new RequestFnfResponderHandler(
            frame.streamId,
            this.registry,
            this.handlers[FrameTypes.REQUEST_FNF],
            frame
          );
        }
        return;
      case FrameTypes.REQUEST_RESPONSE:
        if (this.handlers[FrameTypes.REQUEST_RESPONSE]) {
          new RequestResponseResponderStream(
            frame.streamId,
            this.registry,
            this.outbound,
            this.fragmentSize,
            this.handlers[FrameTypes.REQUEST_RESPONSE],
            frame
          );
        }
        return;

      case FrameTypes.REQUEST_STREAM:
        if (this.handlers[FrameTypes.REQUEST_STREAM]) {
          new RequestStreamResponderStream(
            frame.streamId,
            this.registry,
            this.outbound,
            this.fragmentSize,
            this.handlers[FrameTypes.REQUEST_STREAM],
            frame
          );
        }
        return;

      case FrameTypes.REQUEST_CHANNEL:
        if (this.handlers[FrameTypes.REQUEST_CHANNEL]) {
          new RequestChannelResponderStream(
            frame.streamId,
            this.registry,
            this.outbound,
            this.fragmentSize,
            this.handlers[FrameTypes.REQUEST_CHANNEL],
            frame
          );
        }
        return;
    }
  }
}

class GenericFrameHandler implements FlowControlledFrameHandler {
  constructor(
    private requestHandler: RequestFrameHandler,
    private connectionHandler: ConnectionFrameHandler,
    private registry: StreamsRegistry
  ) {}

  handle(frame: Frame): void {
    if (frame.type === FrameTypes.RESERVED) {
      // TODO: throw
      return;
    }

    if (Frame.isConnection(frame)) {
      this.connectionHandler.handle(frame);
      // TODO: Connection Handler
    } else if (Frame.isRequest(frame)) {
      if (this.registry.get(frame.streamId)) {
        // TODO: Send error and close connection
        return;
      }

      this.requestHandler.handle(frame);
    } else {
      const handler = this.registry.get(frame.streamId);
      if (!handler) {
        // TODO: add validation
        return;
      }

      handler.handle(frame);
    }

    // TODO: add extensions support
  }
}

class ConnectionFrameHandler implements FrameHandler {
  constructor(
    private registry: StreamsRegistry,
    private handlers: { [requestType: number]: any }
  ) {}

  handle(
    frame:
      | SetupFrame
      | ResumeFrame
      | ResumeOkFrame
      | LeaseFrame
      | KeepAliveFrame
      | ErrorFrame
      | MetadataPushFrame
  ): void {
    switch (frame.type) {
      case FrameTypes.KEEPALIVE:
        // TODO: add keepalive handling
        return;
      case FrameTypes.LEASE:
        // TODO: add lease handling
        return;
      case FrameTypes.ERROR:
        // TODO: add connection errors handling
        return;
      case FrameTypes.METADATA_PUSH:
        if (this.handlers[FrameTypes.METADATA_PUSH]) {
        }

        return;
      default:
      // TODO: throw an exception and close connection
    }
  }
}

class SetupFrameHandler implements FlowControlledFrameHandler {
  constructor(
    private socketAcceptor: SocketAcceptor,
    private multiplexer: ClientServerInputMultiplexerDemultiplexer,
    private outbound: Outbound,
    private fragmentSize: number
  ) {}

  handle(
    frame:
      | SetupFrame
      | ResumeFrame
      | ResumeOkFrame
      | LeaseFrame
      | KeepAliveFrame
      | ErrorFrame
      | MetadataPushFrame,
    callback?: (controlRequest: FlowControl) => void
  ): void {
    if (frame.type === FrameTypes.SETUP) {
      this.socketAcceptor
        .accept(
          {
            data: frame.data,
            dataMimeType: frame.dataMimeType,
            metadata: frame.metadata,
            metadataMimeType: frame.metadataMimeType,
            flags: frame.flags,
            keepAliveMaxLifetime: frame.lifetime,
            keepAliveInterval: frame.keepAlive,
            resumeToken: frame.resumeToken,
          },
          new RSocketRequester(this.multiplexer)
        )
        .then(
          (responder) => {
            this.multiplexer["delegateHandler"] = new GenericFrameHandler(
              new RequestFrameHandler(
                this.multiplexer,
                this.outbound,
                this.fragmentSize,
                responder as any
              ),
              new ConnectionFrameHandler(this.multiplexer, responder as any),
              this.multiplexer
            );

            callback(FlowControl.ALL);
          },
          (error) => this.multiplexer.close(error)
        );
      return;
    }
    // TODO: throw an exception and close connection
  }
}

export class RSocketRequester implements RSocket {
  constructor(private multiplexer: ClientServerInputMultiplexerDemultiplexer) {}

  fireAndForget(payload: Payload, responderStream: Subscriber): Cancellable {
    return new RequestFnFRequesterHandler(
      payload,
      responderStream,
      this.multiplexer
    );
  }

  requestResponse(
    payload: Payload,
    responderStream: Subscriber & ExtensionSubscriber
  ): Cancellable & ExtensionSubscriber {
    return new RequestResponseRequesterStream(
      payload,
      responderStream,
      this.multiplexer
    );
  }

  requestStream(
    payload: Payload,
    initialRequestN: number,
    responderStream: Subscriber & ExtensionSubscriber
  ): Subscription & ExtensionSubscriber {
    return new RequestStreamRequesterStream(
      payload,
      initialRequestN,
      responderStream,
      this.multiplexer
    );
  }

  requestChannel(
    payload: Payload,
    initialRequestN: number,
    isCompleted: boolean,
    responderStream: Subscriber & ExtensionSubscriber & Subscription
  ): Subscriber & ExtensionSubscriber & Subscription {
    return new RequestChannelRequesterStream(
      payload,
      initialRequestN,
      isCompleted,
      responderStream,
      this.multiplexer
    );
  }

  metadataPush(metadata: Buffer, responderStream: Subscriber): void {
    throw new Error("Method not implemented.");
  }

  close(error?: Error): void {
    this.multiplexer.close();
  }

  onClose(callback): void {
    this.multiplexer.onClose(callback);
  }
}
