"use strict";

import { ClientTransport } from "rsocket-core";

export type LoadBalanceTarget = () => ClientTransport;

export type LoadBalanceTargetSource =
  | Iterator<LoadBalanceTarget[]>
  | AsyncIterator<LoadBalanceTarget[]>;
