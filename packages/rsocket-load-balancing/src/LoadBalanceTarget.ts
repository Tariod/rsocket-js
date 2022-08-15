"use strict";

export interface LoadBalanceTarget {}

export type LoadBalanceTargetSource =
  | Iterator<LoadBalanceTarget>
  | AsyncIterator<LoadBalanceTarget>;
