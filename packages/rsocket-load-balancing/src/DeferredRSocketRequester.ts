"use strict";

import {
  Cancellable,
  OnExtensionSubscriber,
  OnNextSubscriber,
  OnTerminalSubscriber,
  Payload,
  Requestable,
  RSocket,
} from "rsocket-core";

export class DeferredRSocketRequester implements RSocket {
  public fireAndForget(
    payload: Payload,
    responderStream: OnTerminalSubscriber
  ): Cancellable {
    throw new Error("Not Implemented");
  }

  public requestResponse(
    payload: Payload,
    responderStream: OnTerminalSubscriber &
      OnNextSubscriber &
      OnExtensionSubscriber
  ): Cancellable & OnExtensionSubscriber {
    throw new Error("Not Implemented");
  }

  public requestStream(
    payload: Payload,
    initialRequestN: number,
    responderStream: OnTerminalSubscriber &
      OnNextSubscriber &
      OnExtensionSubscriber
  ): Requestable & Cancellable & OnExtensionSubscriber {
    throw new Error("Not Implemented");
  }

  public requestChannel(
    payload: Payload,
    initialRequestN: number,
    isCompleted: boolean,
    responderStream: OnTerminalSubscriber &
      OnNextSubscriber &
      OnExtensionSubscriber &
      Requestable &
      Cancellable
  ): OnTerminalSubscriber &
    OnNextSubscriber &
    OnExtensionSubscriber &
    Requestable &
    Cancellable {
    throw new Error("Not Implemented");
  }

  public metadataPush(
    metadata: Buffer,
    responderStream: OnTerminalSubscriber
  ): void {
    throw new Error("Not Implemented");
  }

  public close(error?: Error): void {
    throw new Error("Not Implemented");
  }

  public onClose(callback: (error?: Error) => void): void {
    callback(new Error("Not Implemented"));
  }
}
