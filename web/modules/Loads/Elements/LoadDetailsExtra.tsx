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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Divider } from 'antd';
import { ListComponent, HeaderData } from 'modules/Crud/ListComponentV2';
import { HandlingUnitOutboundModelV2 } from '@helpers';
import { StatusHistoryDetailExtraModelV2 } from '@helpers';

export interface IItemDetailsProps {
    loadId?: string | any;
}
const LoadDetailsExtra = ({ loadId }: IItemDetailsProps) => {
    const { t } = useTranslation();

    // header RELATED to Boxes
    const loadBoxesHeaderData: HeaderData = {
        title: `${t('common:associatedLoadsBoxes')}`,
        routes: [],
        actionsComponent: null
    };

    // header RELATED to StatusHistory
    const statusHistoryHeaderData: HeaderData = {
        title: `${t('common:status-history')}`,
        routes: [],
        actionsComponent: null
    };

    return (
        <>
            <Divider />
            <ListComponent
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
                dataModel={HandlingUnitOutboundModelV2}
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
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
            />
        </>
    );
};

export { LoadDetailsExtra };
