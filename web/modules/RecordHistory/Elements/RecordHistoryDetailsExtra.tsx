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
import { AppHead } from '@components';
import { META_DEFAULTS } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Divider } from 'antd';
import { useState } from 'react';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { RecordHistoryDetailBeforeModelV2 as modelBefore } from '@helpers';
import { RecordHistoryDetailAfterModelV2 as modelAfter } from '@helpers';

export interface IItemDetailsProps {
    sequenceId?: string | any;
}

const RecordHistoryDetailsExtra = ({ sequenceId }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const headerDataBefore: HeaderData = {
        title: t('common:object-before'),
        routes: [],
        actionsComponent: null
    };

    const headerDataAfter: HeaderData = {
        title: t('common:object-after'),
        routes: [],
        actionsComponent: null
    };

    modelBefore.moreInfos = 'Before';
    modelAfter.moreInfos = 'After';

    return (
        <>
            <Divider />
            <ListComponent
                searchCriteria={{ sequenceId: parseInt(sequenceId) }}
                headerData={headerDataBefore}
                dataModel={modelBefore}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                searchable={false}
            />
            <Divider />
            <ListComponent
                searchCriteria={{ sequenceId: parseInt(sequenceId) }}
                headerData={headerDataAfter}
                dataModel={modelAfter}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                searchable={false}
            />
        </>
    );
};

export { RecordHistoryDetailsExtra };
