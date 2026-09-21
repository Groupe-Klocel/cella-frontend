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
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useTranslationWithFallback } from 'helpers/utils/TranslationFromDB';
import { showError } from 'helpers/utils/utils';
import { useCallback } from 'react';

/**
 * The user's favourite screens: the star on the home page's chips, its "Favourites" panel and the
 * "Favourites" group at the top of the side menu all share this hook.
 *
 * Stored per user like the theme or the language: a `warehouseWorkerSetting` row with code
 * `homeFavourites` and `valueJson: { hrefs: string[] }`. AppLayout loads every setting of the user
 * into AppContext at boot, so reading is synchronous; toggling updates the context first
 * (optimistic) and then creates or updates the row.
 */
export const HOME_FAVOURITES_CODE = 'homeFavourites';

const CREATE_SETTING = gql`
    mutation ($input: CreateWarehouseWorkerSettingInput!) {
        createWarehouseWorkerSetting(input: $input) {
            id
            code
            valueJson
        }
    }
`;

const UPDATE_SETTING = gql`
    mutation ($id: String!, $input: UpdateWarehouseWorkerSettingInput!) {
        updateWarehouseWorkerSetting(id: $id, input: $input) {
            id
            code
            valueJson
        }
    }
`;

export const useHomeFavourites = () => {
    const { userSettings, user } = useAppState();
    const dispatch = useAppDispatch();
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslationWithFallback();

    const settings: any[] = Array.isArray(userSettings) ? userSettings : [];
    const setting = settings.find((item: any) => item?.code === HOME_FAVOURITES_CODE);
    const favourites: string[] = Array.isArray(setting?.valueJson?.hrefs)
        ? setting.valueJson.hrefs.filter((href: unknown) => typeof href === 'string')
        : [];

    const isFavourite = useCallback((href: string) => favourites.includes(href), [favourites]);

    const toggleFavourite = useCallback(
        async (href: string) => {
            const next = favourites.includes(href)
                ? favourites.filter((item) => item !== href)
                : [...favourites, href];
            const valueJson = { ...(setting?.valueJson ?? {}), hrefs: next };
            const withValue = (id?: string) =>
                setting
                    ? settings.map((item: any) =>
                          item.code === HOME_FAVOURITES_CODE
                              ? { ...item, id: id ?? item.id, valueJson }
                              : item
                      )
                    : [...settings, { id, code: HOME_FAVOURITES_CODE, valueJson }];

            // optimistic: the star reacts immediately
            dispatch({ type: 'SWITCH_USER_SETTINGS', userSettings: withValue() });
            try {
                if (setting?.id) {
                    await graphqlRequestClient.request(UPDATE_SETTING, {
                        id: setting.id,
                        input: { valueJson }
                    });
                } else {
                    const created: any = await graphqlRequestClient.request(CREATE_SETTING, {
                        input: {
                            code: HOME_FAVOURITES_CODE,
                            warehouseWorkerId: user?.id,
                            valueJson
                        }
                    });
                    dispatch({
                        type: 'SWITCH_USER_SETTINGS',
                        userSettings: withValue(created?.createWarehouseWorkerSetting?.id)
                    });
                }
            } catch (error) {
                console.error('home favourites: could not save', error);
                showError(t('messages:error-update-data'));
                dispatch({ type: 'SWITCH_USER_SETTINGS', userSettings: settings });
            }
        },
        [favourites, setting, settings, dispatch, graphqlRequestClient, user?.id, t]
    );

    return { favourites, isFavourite, toggleFavourite };
};
