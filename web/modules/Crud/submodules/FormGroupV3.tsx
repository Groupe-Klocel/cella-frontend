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
import { Form } from 'antd';
import moment from 'moment';
import 'dayjs/locale/fr';
import 'dayjs/locale/en';
import { FC } from 'react';
import { FormDataType } from '../../../models/ModelsV2';
import { useRouter } from 'next/router';
import AutoComplete from '../../../components/common/smart/Form/MainInputs/AutoCompleteInput';
import StringInput from 'components/common/smart/Form/MainInputs/StringInput';
import NumberInput from 'components/common/smart/Form/MainInputs/NumberInput';
import TextAreaInput from 'components/common/smart/Form/MainInputs/TextAreaInput';
import SelectInput from 'components/common/smart/Form/MainInputs/SelectInput';
import DatePickerInput from 'components/common/smart/Form/MainInputs/DatePickerInput';
import RangePickerInput from 'components/common/smart/Form/MainInputs/RangePickerInput';
import CheckboxInput from 'components/common/smart/Form/MainInputs/CheckboxInput';

export interface IGeneralSearchProps {
    form: any;
    item: any;
    defaultSubOptions?: any;
    allSubOptions?: any;
    setAllSubOptions?: any;
    handleSubmit?: any;
    filtersParameters?: boolean;
    type?: 'Filters' | 'AdvancedFilters' | 'Others';
}

const FormGroupV3: FC<IGeneralSearchProps> = ({
    form,
    item,
    defaultSubOptions,
    allSubOptions,
    setAllSubOptions,
    handleSubmit,
    filtersParameters,
    type
}: IGeneralSearchProps) => {
    const router = useRouter();

    moment.locale(router.locale);

    //enter key for form validation
    const handleKeyPress = (event: any) => {
        if (event.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <>
            <Form form={form} layout="vertical" name="control-hooks" onKeyUp={handleKeyPress}>
                {(() => {
                    if (item.type === FormDataType.Number) {
                        return <NumberInput item={item} key={item.name} />;
                    } else if (item.type === FormDataType.String) {
                        return (
                            <StringInput
                                item={item}
                                key={item.name}
                                form={form}
                                filtersParameters={filtersParameters}
                            />
                        );
                    } else if (item.type === FormDataType.TextArea) {
                        return <TextAreaInput item={item} key={item.name} />;
                    } else if (
                        item.type === FormDataType.Dropdown ||
                        item.type === FormDataType.Boolean
                    ) {
                        return (
                            <SelectInput
                                item={item}
                                key={item.name}
                                defaultSubOptions={defaultSubOptions}
                                setAllSubOptions={setAllSubOptions}
                                mode="multiple"
                            />
                        );
                    } else if (
                        item.type === FormDataType.Calendar ||
                        (item.type === FormDataType.CalendarRange && type === 'AdvancedFilters')
                    ) {
                        return <DatePickerInput item={item} key={item.name} />;
                    } else if (
                        item.type === FormDataType.CalendarRange &&
                        type !== 'AdvancedFilters'
                    ) {
                        return <RangePickerInput item={item} key={item.name} />;
                    } else if (item.type === FormDataType.AutoComplete) {
                        return (
                            <AutoComplete
                                item={item}
                                key={item.name}
                                setAllSubOptions={setAllSubOptions}
                            />
                        );
                    } else if (item.type === FormDataType.CheckBox) {
                        return <CheckboxInput item={item} key={item.name} />;
                    }
                    return null;
                })()}
            </Form>
        </>
    );
};

FormGroupV3.displayName = 'FormGroupV3';

export { FormGroupV3 };
