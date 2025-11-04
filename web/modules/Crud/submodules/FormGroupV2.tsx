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
import { Form, Spin } from 'antd';
import moment from 'moment';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useState } from 'react';
import { FilterFieldType, FormDataType, ModelType } from '../../../models/ModelsV2';
import { DraggerInput } from 'components/common/smart/Form/MainInputs/DraggerInput';
import { useRouter } from 'next/router';
import AutoComplete from '../../../components/common/smart/Form/MainInputs/AutoCompleteInput';
import 'moment/locale/fr';
import NumberInput from 'components/common/smart/Form/MainInputs/NumberInput';
import StringInput from 'components/common/smart/Form/MainInputs/StringInput';
import TextAreaInput from 'components/common/smart/Form/MainInputs/TextAreaInput';
import SelectInput from 'components/common/smart/Form/MainInputs/SelectInput';
import DatePickerInput from 'components/common/smart/Form/MainInputs/DatePickerInput';
import CheckboxInput from 'components/common/smart/Form/MainInputs/CheckboxInput';
import PasswordInput from 'components/common/smart/Form/MainInputs/PasswordInput';
import { ContentSpin } from '@components';

export interface IFormGroupProps {
    inputs: Array<FilterFieldType>;
    setValues?: any;
    dataModel?: any;
    imageData?: string;
    extraRule?: Array<any>;
    stringCodeScopes?: any;
    setFormInfos?: any;
}

const FormGroup: FC<IFormGroupProps> = (props: IFormGroupProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const errorMessageEmptyInput = t('messages:error-message-empty-input');

    const [allSubOptions, setAllSubOptions] = useState<any>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    let numberOfSubOptions = 0;
    props.inputs.forEach((input) => {
        if (input.type === FormDataType.AutoComplete || input.type === FormDataType.Dropdown) {
            numberOfSubOptions += 1;
        }
    });

    if (numberOfSubOptions === allSubOptions?.length && isLoading) {
        setIsLoading(false);
    }

    moment.locale(router.locale);

    const localeData = moment.localeData();
    const localeDateTimeFormat =
        localeData.longDateFormat('L') + ' ' + localeData.longDateFormat('LT');

    function ruleAttribution(rules: any, name: string) {
        const [isMandatory, minRule, maxRule] = rules;
        let ruleArray = [];
        if (isMandatory) {
            ruleArray.push({ required: true, message: errorMessageEmptyInput });
        }
        if (minRule !== undefined && minRule !== null) {
            ruleArray.push({
                min: minRule,
                type: 'number',
                message: t('messages:select-number-min', {
                    min: JSON.stringify(minRule)
                })
            });
        }
        if (maxRule !== undefined && maxRule !== null) {
            ruleArray.push({
                max: maxRule,
                type: 'number',
                message: t('messages:select-number-max', {
                    max: JSON.stringify(maxRule)
                })
            });
        }
        if (props.extraRule) {
            props.extraRule.forEach((oneRule) => {
                if (name === oneRule.fieldsInfo) {
                    ruleArray.push(oneRule);
                }
            });
        }
        return ruleArray;
    }

    const [inputWithRules, setInputWithRules] = useState<Array<FilterFieldType>>([]);

    useEffect(() => {
        setInputWithRules(
            props.inputs.map((input) => ({
                ...input,
                rules: ruleAttribution(input.rulesInfos, input.name)
            }))
        );
    }, [props.inputs]);

    if (!props.inputs || props.inputs.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin />
            </div>
        );
    }

    return (
        <>
            {isLoading && <ContentSpin />}
            <div hidden={isLoading}>
                {inputWithRules.map((item: FilterFieldType, index: number) => {
                    if (item.type === FormDataType.Number) {
                        return <NumberInput item={item} key={item.name + index} />;
                    } else if (item.type == FormDataType.String)
                        return <StringInput item={item} key={item.name + index} />;
                    else if (item.type == FormDataType.Password)
                        return <PasswordInput item={item} key={item.name + index} />;
                    else if (item.type == FormDataType.TextArea)
                        return <TextAreaInput item={item} key={item.name + index} />;
                    else if (item.type == FormDataType.Dropdown)
                        return (
                            <SelectInput
                                item={item}
                                setValues={props.setValues}
                                key={item.name + index}
                                setAllSubOptions={setAllSubOptions}
                                setFormInfos={props.setFormInfos}
                            />
                        );
                    else if (item.type == FormDataType.Calendar) {
                        return (
                            <DatePickerInput
                                item={item}
                                key={item.name + index}
                                format={localeDateTimeFormat}
                            />
                        );
                    } else if (item.type == FormDataType.AutoComplete) {
                        return (
                            <AutoComplete
                                item={item}
                                key={item.name + index}
                                setAllSubOptions={setAllSubOptions}
                            />
                        );
                    } else if (item.type == FormDataType.File)
                        return (
                            <Form.Item
                                label={item.displayName ? item.displayName : t(`d:${item.name}`)}
                                key={item.name + index}
                            >
                                <DraggerInput
                                    setValues={props.setValues}
                                    editValue={props.imageData ?? undefined}
                                />
                            </Form.Item>
                        );
                    else return <CheckboxInput item={item} key={item.name + index} />;
                })}
            </div>
        </>
    );
};

FormGroup.displayName = 'FormGroup';

export { FormGroup };
