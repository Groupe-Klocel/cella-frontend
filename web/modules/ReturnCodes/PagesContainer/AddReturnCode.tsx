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
import { ContentSpin, HeaderContent } from '@components';
import { getModesFromPermissions } from '@helpers';
import { Alert } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { AddReturnCodeForm } from 'modules/ReturnCodes/Forms/AddReturnCodeForm';
import { addReturnCodeRoutes } from 'modules/ReturnCodes/Static/ReturnCodeRoutes';
import { useTranslationWithFallback as useTranslation } from '@helpers';

export const AddReturnCode = () => {
    const { t } = useTranslation('actions');
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.Parameter);

    return (
        <>
            {permissions ? (
                !modes.includes(ModeEnum.Create) ? (
                    <>
                        <Alert
                            message={t('messages:error')}
                            description={t('errors:APP-000200')}
                            type="error"
                            showIcon
                        />
                    </>
                ) : (
                    <>
                        <HeaderContent
                            title={t('add2', { name: t('menu:return-code') })}
                            routes={addReturnCodeRoutes}
                        />

                        <AddReturnCodeForm />
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};
