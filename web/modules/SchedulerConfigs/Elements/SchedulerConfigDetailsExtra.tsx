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
import { Divider } from 'antd';
import { useState } from 'react';
import { SchedulerConfigListComponent } from 'modules/SchedulerConfigs/Elements/SchedulerConfigListComponent';
import { SchedulerConfigDetailModelV2 as argument } from 'models/SchedulerConfigDetailModelV2';
import { SchedulerConfigModelV2 as model } from 'models/SchedulerConfigModelV2';

export interface IItemDetailsProps {
    Id?: string | any;
    details: any;
}

const SchedulerConfigDetailsExtra = ({ Id, details }: IItemDetailsProps) => {
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    // #region extract data from modelV2
    const listFields = Object.keys(model.fieldsInfo).filter(
        (key) => model.fieldsInfo[key].isListRequested
    );

    return (
        <>
            <Divider />
            <SchedulerConfigListComponent
                searchCriteria={{ Id: Id }}
                details={details}
                schedulerConfigId={Id}
                dataModel={argument}
                schedulerConfigFields={listFields}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                searchable={false}
                refresh={true}
            />
        </>
    );
};

export { SchedulerConfigDetailsExtra };
