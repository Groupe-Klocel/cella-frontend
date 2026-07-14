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
import { RecordHistoryDiffComponent } from './RecordHistoryDiffComponent';

export interface IItemDetailsProps {
    // From next/router: a string on the [id] route, but string[] | undefined in the general case.
    sequenceId?: string | string[];
}

const RecordHistoryDetailsExtra = ({ sequenceId }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    // Normalize the router param once. Guarding against a missing/non-numeric id avoids a NaN
    // sequenceId, which would serialize to a null filter (an unfiltered fetch) on the lists.
    const resolvedSequenceId = Array.isArray(sequenceId) ? sequenceId[0] : sequenceId;
    if (!resolvedSequenceId) return <></>;
    const numericSequenceId = parseInt(resolvedSequenceId, 10);
    if (Number.isNaN(numericSequenceId)) return <></>;

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
            <RecordHistoryDiffComponent sequenceId={resolvedSequenceId} />
            <Divider />
            <ListComponent
                searchCriteria={{ sequenceId: numericSequenceId }}
                headerData={headerDataBefore}
                dataModel={modelBefore}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                searchable={false}
                noDBSave={true}
            />
            <Divider />
            <ListComponent
                searchCriteria={{ sequenceId: numericSequenceId }}
                headerData={headerDataAfter}
                dataModel={modelAfter}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                searchable={false}
                noDBSave={true}
            />
        </>
    );
};

export { RecordHistoryDetailsExtra };
