"use strict";

import { ConnectorConfig, RSocket } from "rsocket-core";

import { DeferredRSocketRequester } from "./DeferredRSocketRequester";
import { LoadBalanceStrategy } from "./LoadBalanceStrategy";
import { LoadBalanceTargetSource } from "./LoadBalanceTarget";
import { RoundRobinLoadBalanceStrategy } from "./strategies";

export type LoadBalancedRSocketConnectorConfig = Omit<
  ConnectorConfig,
  "transport"
>;

export class LoadBalancedRSocketConnector {
  public constructor(
    private readonly config: LoadBalancedRSocketConnectorConfig,
    private readonly targets: LoadBalanceTargetSource,
    private readonly strategy: LoadBalanceStrategy = new RoundRobinLoadBalanceStrategy()
  ) {}

  public async connect(): Promise<RSocket> {
    return new DeferredRSocketRequester();
  }
}
