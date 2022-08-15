"use strict";

import { RSocket } from "rsocket-core";

import { LoadBalanceStrategy } from "./LoadBalanceStrategy";
import { LoadBalanceTargetSource } from "./LoadBalanceTarget";
import { RoundRobinLoadBalanceStrategy } from "./strategies";

export class LoadBalancedRSocketConnector {
  public constructor(
    public readonly targets: LoadBalanceTargetSource,
    public readonly strategy: LoadBalanceStrategy = new RoundRobinLoadBalanceStrategy()
  ) {}

  public async connect(): Promise<RSocket> {
    return null;
  }
}
