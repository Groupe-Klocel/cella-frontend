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
import { pathParams, getModesFromPermissions } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Divider, Typography } from 'antd';
import { useState } from 'react';
import { useAppState } from 'context/AppContext';
import { Table } from 'generated/graphql';
import { ListComponent } from 'modules/Crud/ListComponentV2';
import { PatternPathLocationModelV2 } from 'models/PatternPathLocationModelV2';

const { Title } = Typography;

export interface IItemDetailsProps {
    id?: string | any;
}

const PatternPathDetailsExtra = ({ id }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.Barcode);

    return (
        <>
            <Divider />
            <Title level={4}>{t('common:associated-locations')}</Title>
            <ListComponent
                searchCriteria={{ patternPathId: id }}
                dataModel={PatternPathLocationModelV2}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { locationId: string }) => (
                            <LinkButton
                                icon={<EyeTwoTone />}
                                path={pathParams('/locations/[id]', record.locationId)}
                            />
                        )
                    }
                ]}
                searchable={false}
            />
        </>
    );
};

export { PatternPathDetailsExtra };
