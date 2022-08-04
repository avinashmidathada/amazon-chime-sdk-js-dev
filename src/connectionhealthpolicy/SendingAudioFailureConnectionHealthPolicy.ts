// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import BaseConnectionHealthPolicy from "./BaseConnectionHealthPolicy";
import ConnectionHealthPolicy from "./ConnectionHealthPolicy";
import ConnectionHealthPolicyConfiguration from "./ConnectionHealthPolicyConfiguration";
import ConnectionHealthData from "./ConnectionHealthData";
import Logger from "../logger/Logger";

export default class SendingAudioFailureConnectionHealthPolicy
    extends BaseConnectionHealthPolicy implements ConnectionHealthPolicy {

    private readonly secondsToConsider: number;
    private readonly initialWaitTimeMs: number;
    private readonly coolDownTimeMs: number;
    private readonly maximumTimesToWarn: number;
    private warnCount: number;
    private lastWarnTimestampMs: number;

    constructor(
        private logger: Logger,
        configuration: ConnectionHealthPolicyConfiguration,
        data: ConnectionHealthData
    ) {
        super(configuration, data, 'Sending Audio Health');
        this.secondsToConsider = configuration.sendingAudioFailureSamplesToConsider;
        this.initialWaitTimeMs = configuration.sendingAudioFailureInitialWaitTimeMs;
        this.maximumTimesToWarn = configuration.maximumTimesToWarn;
        this.coolDownTimeMs = configuration.cooldownTimeMs;
        this.lastWarnTimestampMs = 0;
        this.warnCount = 0;
    }

    private isSendingAudioUnHealthy(): boolean {
        const hasEnoughTimeElapsedToEvaluateStatus = !this.currentData.isConnectionStartRecent(this.initialWaitTimeMs);
        const areAudioPacketsNotBeingSent = this.currentData.consecutiveStatsWithNoAudioPacketsSent >= this.secondsToConsider;
        return hasEnoughTimeElapsedToEvaluateStatus && areAudioPacketsNotBeingSent;
    }

    health(): number {
        const didWarnRecently = Date.now() - this.lastWarnTimestampMs < this.coolDownTimeMs;
        if (this.isSendingAudioUnHealthy()) {
            if (this.currentHealth > this.minimumHealth() && !didWarnRecently) {
                this.logger.debug(`Sending Audio is unhealthy for ${this.secondsToConsider} seconds`);
                this.warnCount++;
                if (this.warnCount > this.maximumTimesToWarn) {
                    this.logger.debug('SendingAudioFailure maximum warnings were breached. Falling back to reporting healthy.');
                    return this.maximumHealth();
                }
                this.lastWarnTimestampMs = Date.now();
                return this.minimumHealth();
            } else {
                return this.currentHealth;
            }
        }
        return this.maximumHealth();
    }
}