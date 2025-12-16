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
import useTranslation from 'next-translate/useTranslation';
import { Divider } from 'antd';
import { useState } from 'react';
import { ConfigurationListComponent } from 'modules/Configurations/Elements/ConfigurationListComponent';
import { ConfigModelV2 as model } from '@helpers';
import { ConfigExtrasModelV2 as extras } from '@helpers';

export interface IItemDetailsProps {
    Id?: string | any;
    details: any;
    url?: string;
}

const ConfigurationDetailsExtra = ({ Id, details, url }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    // #region extract data from modelV2
    const listFields = Object.keys(model.fieldsInfo).filter(
        (key) => model.fieldsInfo[key].isListRequested
    );
    return (
        <>
            <Divider />
            <ConfigurationListComponent
                searchCriteria={{ Id: Id }}
                details={details}
                parameterId={Id}
                dataModel={extras}
                parameterFields={listFields}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                searchable={false}
                refresh={true}
                url={url}
            />
        </>
    );
};

export { ConfigurationDetailsExtra };
