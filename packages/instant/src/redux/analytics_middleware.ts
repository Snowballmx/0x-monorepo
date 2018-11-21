import { Web3Wrapper } from '@0x/web3-wrapper';
import * as _ from 'lodash';
import { Middleware } from 'redux';

import { ETH_DECIMALS } from '../constants';
import { Account, AccountState } from '../types';
import { analytics } from '../util/analytics';

import { Action, ActionTypes } from './actions';

import { State } from './reducer';

export const analyticsMiddleware: Middleware = store => next => middlewareAction => {
    const prevState = store.getState() as State;
    const prevAccount = prevState.providerState.account;

    const nextAction = next(middlewareAction) as Action;

    const curState = store.getState() as State;
    const curAccount = curState.providerState.account;

    switch (nextAction.type) {
        case ActionTypes.SET_ACCOUNT_STATE_READY:
            if (curAccount.state === AccountState.Ready) {
                const didJustTurnReady = prevAccount.state !== AccountState.Ready;
                const didJustUpdateAddress =
                    prevAccount.state === AccountState.Ready && prevAccount.address !== curAccount.address;
                const ethAddress = curAccount.address;
                if (didJustTurnReady) {
                    analytics.trackAccountReady(ethAddress);
                    analytics.addUserProperties({ ethAddress });
                } else if (didJustUpdateAddress) {
                    analytics.trackAccountAddressChanged(ethAddress);
                    analytics.addUserProperties({ ethAddress });
                }
            }
            break;
        case ActionTypes.SET_ACCOUNT_STATE_LOCKED:
            if (prevAccount.state !== AccountState.Locked && curAccount.state === AccountState.Locked) {
                // if we are moving from account not locked to account locked, update the current address to undefined and track `Account - Locked`
                const ethAddress = undefined;
                analytics.addUserProperties({ ethAddress });
                analytics.trackAccountLocked();
            }
            break;
        case ActionTypes.UPDATE_ACCOUNT_ETH_BALANCE:
            if (
                curAccount.state === AccountState.Ready &&
                curAccount.ethBalanceInWei &&
                !_.isEqual(curAccount, prevAccount)
            ) {
                const ethBalanceInUnitAmount = Web3Wrapper.toUnitAmount(
                    curAccount.ethBalanceInWei,
                    ETH_DECIMALS,
                ).toString();
                analytics.addUserProperties({ ethBalanceInUnitAmount });
            }
    }

    return nextAction;
};
