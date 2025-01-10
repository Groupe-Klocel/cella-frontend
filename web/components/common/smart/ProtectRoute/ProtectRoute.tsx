/**
CELLA Frontend
Website and Mobile templates that can be used to communicate
with CELLA WMS APIs.
Copyright (C) 2023 KLOCEL <contact@klocel.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
**/
import { ScreenSpin } from '@components';
import { cookie, OnlyChildrenType, showError, showWarning } from '@helpers';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { GetMyInfoQuery, useGetMyInfoQuery } from 'generated/graphql';
import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppState } from 'context/AppContext';
import useTranslation from 'next-translate/useTranslation';
import { GraphQLClient } from 'graphql-request';
import { gql } from 'graphql-request';

const ProtectRoute: any | null = ({ children }: OnlyChildrenType) => {
    const router = useRouter();
    const { t } = useTranslation();
    const { isAuthenticated, loading, logout } = useAuth();
    const { user, userSettings: initialUserSettings } = useAppState();
    const dispatchUser = useAppDispatch();
    const setUserInfo = useCallback(
        (newUser: any) =>
            dispatchUser({
                type: 'SET_USER_INFO',
                user: newUser
            }),
        [dispatchUser, user]
    );
    const token = cookie.get('token');
    const requestHeader = {
        authorization: `Bearer ${token}`
    };
    const graphqlRequestClient = new GraphQLClient(
        process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT as string,
        {
            headers: requestHeader
        }
    );
    const { isLoading, data, error } = useGetMyInfoQuery<Partial<GetMyInfoQuery>, Error>(
        graphqlRequestClient
    );

    useEffect(() => {
        // check current session
        if (data && !isLoading) {
            const tmpUser: any = JSON.parse(JSON.stringify(data.me));
            delete tmpUser['userRoles'];
            setUserInfo(data.me);
            if (JSON.stringify(tmpUser) !== JSON.stringify(user)) {
                router.push('/login');
            }
            if (tmpUser.resetPassword) {
                router.push('/reset-password');
                showWarning(t('messages:please-reset-password'));
            }
        }
    }, [isLoading, data]);

    useEffect(() => {
        if (!isLoading && error) {
            showError('Your session has been expired, please login again.');
            setTimeout(logout, 2000);
        }
    }, [isLoading, error]);

    if (loading || (!isAuthenticated && router.pathname !== '/login')) {
        router.push('/login');
        return <ScreenSpin />;
    }
    return children;
};

ProtectRoute.displayName = 'ProtectRoute';

export { ProtectRoute };
