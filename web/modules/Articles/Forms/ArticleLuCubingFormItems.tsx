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
// Cubing constraints of an article LU, shared by the add and edit forms. They are passed as they
// are to the `cube` mutation by the cubing function: `upright`, `maxLoad` (grams the pack bears on
// top of it; 0 = nothing, empty = no limit), `cubingCriteria` (the pack's tags) and
// `cubingAllowedCriteria` (the tags accepted beside it). Tags are the codes of the
// `cubing_criteria` parameters.
import { Checkbox, Col, Form, InputNumber, Select } from 'antd';
import { getLanguageCode, useTranslationWithFallback as useTranslation } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useRouter } from 'next/router';
import { useMemo } from 'react';

export const CUBING_CRITERIA_SCOPE = 'cubing_criteria';

/**
 * The tag lists mean `null` = any tag, `[]` = no tag: an emptied selection is sent as null, and an
 * empty load as no limit.
 */
export const normalizeArticleLuCubingInput = (formData: any) => {
    ['cubingCriteria', 'cubingAllowedCriteria'].forEach((key) => {
        if (Array.isArray(formData[key]) && formData[key].length === 0) formData[key] = null;
    });
    if (formData.maxLoad === '' || formData.maxLoad === undefined) formData.maxLoad = null;
    return formData;
};

export const ArticleLuCubingFormItems = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const language = getLanguageCode(router);
    const { parameters } = useAppState();

    // codes are kept as strings: the API takes the tags as [String!]
    const criteriaOptions = useMemo(
        () =>
            (parameters ?? [])
                .filter((parameter: any) => parameter.scope === CUBING_CRITERIA_SCOPE)
                .map((parameter: any) => ({
                    value: String(parameter.code),
                    label: parameter.translation?.[language] ?? parameter.value ?? parameter.code
                })),
        [parameters, language]
    );

    const criteriaSelect = (
        <Select mode="multiple" allowClear options={criteriaOptions} optionFilterProp="label" />
    );

    return (
        <>
            <Col xs={8} xl={12}>
                <Form.Item name="upright" valuePropName="checked">
                    <Checkbox>{t('d:upright')}</Checkbox>
                </Form.Item>
            </Col>
            <Col xs={8} xl={12}>
                <Form.Item label={t('d:maxLoad')} name="maxLoad">
                    <InputNumber min={0} />
                </Form.Item>
            </Col>
            <Col xs={8} xl={12}>
                <Form.Item label={t('d:cubingCriteria')} name="cubingCriteria">
                    {criteriaSelect}
                </Form.Item>
            </Col>
            <Col xs={8} xl={12}>
                <Form.Item label={t('d:cubingAllowedCriteria')} name="cubingAllowedCriteria">
                    {criteriaSelect}
                </Form.Item>
            </Col>
        </>
    );
};
