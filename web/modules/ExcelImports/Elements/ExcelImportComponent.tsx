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
import { Space, Alert, Divider, Layout } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { getModesFromPermissions } from '@helpers';
import { ModelType } from 'models/ModelsV2';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { useRouter } from 'next/router';
import { ExcelImportForm } from 'modules/ExcelImports/Forms/ExcelImportForm';

export type HeaderData = {
    title: string;
    routes: Array<any>;
    actionsComponent: any;
};
export type ActionButtons = {
    actionsComponent: any;
};
export interface IListProps {
    dataModel: ModelType;
    headerData?: HeaderData;
}

const ExcelImportComponent = (props: IListProps) => {
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const { t } = useTranslation();
    const router = useRouter();

    // #region DEFAULT PROPS
    const defaultProps = {
        searchable: true,
        searchCriteria: {},
        extraColumns: [],
        actionColumns: []
    };
    props = { ...defaultProps, ...props };

    const layoutStyle: React.CSSProperties = {
        marginLeft: 20,
        backgroundColor: '#adb5bd',
        textAlign: 'center',
        borderRadius: 8,
        overflow: 'hidden',
        width: 'calc(99% - 8px)',
        maxWidth: 'calc(100% - 8px)'
    };

    return (
        <>
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
                            {props.headerData ? (
                                <HeaderContent
                                    title={props.headerData.title}
                                    routes={props.headerData.routes}
                                    actionsRight={
                                        <Space>
                                            {props.headerData.actionsComponent != null ? (
                                                props.headerData.actionsComponent
                                            ) : (
                                                <></>
                                            )}
                                        </Space>
                                    }
                                />
                            ) : (
                                <></>
                            )}
                            <Divider />
                            <Layout style={layoutStyle}>
                                <ExcelImportForm />
                            </Layout>
                        </>
                    )
                ) : (
                    <ContentSpin />
                )}
            </>
        </>
    );
};

//ExcelImportComponent.displayName = 'ListWithFilter';
export { ExcelImportComponent };
