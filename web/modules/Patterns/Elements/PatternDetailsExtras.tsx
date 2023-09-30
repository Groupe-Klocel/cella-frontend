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
import { pathParams, getModesFromPermissions, pathParamsFromDictionary } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { Divider } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { PatternPathModelV2 } from 'models/PatternPathModelV2';
import { useState } from 'react';

export interface IItemDetailsProps {
    id?: string | any;
    name?: string | any;
    stockOwnerId?: string;
    stockOwnerName?: string | any;
}

const PatternDetailsExtra = ({ id, name, stockOwnerId, stockOwnerName }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.PatternPath);

    const headerData: HeaderData = {
        title: t('common:pattern-paths', { name: t('common:associated') }),
        routes: [],
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:pattern-path') })}
                    path={pathParamsFromDictionary('/patterns/paths/add', {
                        patternId: id,
                        patternName: name,
                        stockOwnerId: stockOwnerId,
                        stockOwnerName: stockOwnerName
                    })}
                    type="primary"
                />
            ) : null
    };

    return (
        <>
            {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ patternId: id }}
                        headerData={headerData}
                        dataModel={PatternPathModelV2}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string }) => (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams('/pattern-paths/[id]', record.id)}
                                    />
                                )
                            }
                        ]}
                        searchable={false}
                    />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export { PatternDetailsExtra };
