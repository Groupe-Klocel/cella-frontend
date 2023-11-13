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
import { LinkButton } from '@components';
import { EyeTwoTone } from '@ant-design/icons';
import { pathParams } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { Divider, Typography } from 'antd';
import { useState } from 'react';
import { BarcodeRenderModal } from 'modules/Barcodes/Elements/BarcodeRenderModal';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { ListComponent, HeaderData } from 'modules/Crud/ListComponent';
import {
    ListComponent as ListComponentV2,
    HeaderData as HeaderDataV2
} from 'modules/Crud/ListComponentV2';
import { LoadsBoxesModel } from 'models/LoadsBoxesModel';
import { StatusHistoryDetailExtraModelV2 } from 'models/StatusHistoryDetailExtraModelV2';
import configs from '../../../../common/configs.json';
export interface IItemDetailsProps {
    loadId?: string | any;
}
const { Title } = Typography;
const LoadDetailsExtra = ({ loadId }: IItemDetailsProps) => {
    const { t } = useTranslation();

    // header RELATED to Boxes
    const loadBoxesHeaderData: HeaderData = {
        title: `${t('common:associatedLoadsBoxes')}`,
        routes: [],
        actionsComponent: null
    };

    // header RELATED to StatusHistory
    const statusHistoryHeaderData: HeaderDataV2 = {
        title: `${t('common:status-history')}`,
        routes: [],
        actionsComponent: null
    };

    return (
        <>
            <Divider />
            <ListComponentV2
                searchCriteria={{ objectId: loadId }}
                dataModel={StatusHistoryDetailExtraModelV2}
                headerData={statusHistoryHeaderData}
                searchable={false}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                columnFilter={false}
            />
            <Divider />
            <ListComponent
                searchCriteria={{ loadId: loadId }}
                dataModel={LoadsBoxesModel}
                headerData={loadBoxesHeaderData}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string }) => (
                            <LinkButton
                                icon={<EyeTwoTone />}
                                path={pathParams('/boxes/[id]', record.id)}
                            />
                        )
                    }
                ]}
                searchable={false}
            />
        </>
    );
};

export { LoadDetailsExtra };
