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
import { SearchOutlined } from '@ant-design/icons';
import { ContentSpin, HeaderContent, LinkButton } from '@components';
import { getModesFromPermissions, showError } from '@helpers';
import { Alert, Button, Form, Space } from 'antd';
import { useAppState } from 'context/AppContext';
import { useDrawerDispatch } from 'context/DrawerContext';
import { ModeEnum, Table } from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useCallback, useState } from 'react';
import { BarcodesList } from '../Elements/BarcodesList';
import { BarcodesSearch } from '../Forms/BarcodesSearch';
import { barcodesRoutes } from '../Static/barcodesRoutes';

export const Barcodes = () => {
    const { t } = useTranslation();
    //	SEARCH DRAWER
    const [search, setSearch] = useState({});
    const [formSearch] = Form.useForm();
    const dispatchDrawer = useDrawerDispatch();
    const openSearchDrawer = useCallback(
        () =>
            dispatchDrawer({
                type: 'OPEN_DRAWER',
                title: 'actions:search',
                comfirmButtonTitle: 'actions:search',
                comfirmButton: true,
                cancelButtonTitle: 'actions:reset',
                cancelButton: true,
                submit: true,
                content: <BarcodesSearch form={formSearch} />,
                onCancel: () => handleReset(),
                onComfirm: () => handleSubmit()
            }),
        [dispatchDrawer]
    );

    const closeDrawer = useCallback(
        () => dispatchDrawer({ type: 'CLOSE_DRAWER' }),
        [dispatchDrawer]
    );

    const handleSubmit = () => {
        formSearch
            .validateFields()
            .then(() => {
                // Here make api call of something else
                const searchValues = formSearch.getFieldsValue(true);

                console.log('Mes infos de bases : ', searchValues);
                const newSearchValues = {
                    ...searchValues,
                    blacklisted: searchValues['blacklisted'] == 'true'
                };
                if (
                    searchValues['stockOwnerId'] == '' ||
                    searchValues['stockOwnerId'] === undefined
                )
                    delete newSearchValues['stockOwnerId'];
                if (searchValues['blacklisted'] == '' || searchValues['blacklisted'] === undefined)
                    delete newSearchValues['blacklisted'];
                setSearch(newSearchValues);
                closeDrawer();
            })
            .catch((err) => showError(t('messages:error-getting-data')));
    };

    const handleReset = () => {
        formSearch.resetFields();
    };

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.Barcode);

    return (
        <>
            {permissions ? (
                !modes.includes(ModeEnum.Read) ? (
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
                            title={t('menu:barcodes')}
                            routes={barcodesRoutes}
                            actionsRight={
                                <Space>
                                    <Button
                                        icon={<SearchOutlined />}
                                        onClick={() => openSearchDrawer()}
                                    />
                                    <LinkButton
                                        title={t('actions:add2', { name: t('common:barcode') })}
                                        path="/barcodes/add"
                                        type="primary"
                                    />
                                </Space>
                            }
                        />
                        <BarcodesList searchCriteria={search} />
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};
