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
import { AppHead, HeaderContent } from '@components';
import { getModesFromPermissions } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { SecuritySettingsForm } from 'modules/Security/SecuritySettingsForm';
import { securityRoutes } from 'modules/Security/Static/securityRoutes';
import { FC } from 'react';

type PageComponent = FC & { layout: typeof MainLayout };

const SecurityPage: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, 'wm_security');

    return (
        <>
            <AppHead title={t('common:security')} />
            <HeaderContent title={t('common:security')} routes={securityRoutes} />
            {modes.includes(ModeEnum.Read) ? (
                <SecuritySettingsForm isEditable={modes.includes(ModeEnum.Update)} />
            ) : (
                <></>
            )}
        </>
    );
};

SecurityPage.layout = MainLayout;

export default SecurityPage;
