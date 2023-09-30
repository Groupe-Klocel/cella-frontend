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
import { Alert, Layout } from 'antd';

import { FC } from 'react';
import styled from 'styled-components';
import { AddItemForm } from './submodules/AddItemForm';
import { FilterFieldType, ModelType } from 'models/Models';
import { getModesFromPermissions } from '@helpers';
import { ModeEnum } from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useAppState } from 'context/AppContext';
import { ContentSpin } from '@components';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface IAddItemFormProps {
    headerComponent: any;
    dataModel: ModelType;
    addSteps: Array<Array<FilterFieldType>>;
    routeAfterSuccess: string;
    extraData?: any;
    routeOnCancel?: string;
}

const AddItemComponent: FC<IAddItemFormProps> = (props: IAddItemFormProps) => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    return (
        <>
            <StyledPageContent>
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
                            {props.headerComponent}

                            <AddItemForm
                                extraData={props.extraData ? props.extraData : {}}
                                addSteps={props.addSteps}
                                dataModel={props.dataModel}
                                routeAfterSuccess={props.routeAfterSuccess}
                                routeOnCancel={props.routeOnCancel}
                            />
                        </>
                    )
                ) : (
                    <ContentSpin />
                )}
            </StyledPageContent>
        </>
    );
};

AddItemComponent.displayName = 'AddItemComponent';

export { AddItemComponent };
