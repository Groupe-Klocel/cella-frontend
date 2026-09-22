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
import {
    LocationModelV2 as model,
    findCodeByScopeAndValue,
    getLanguageCode,
    isNumeric,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Col, Divider, Form, Input, InputNumber, Modal, Row, Select, Typography } from 'antd';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';

const { Text } = Typography;

export interface IEditLocationsRenderModalProps {
    visible: boolean;
    rows: any;
    showhideModal: () => void;
    setRefetch: () => void;
    setSelectedRowKeys: (keys: any[]) => void;
}

// Fields holding a config/parameter code: the API expects an Int.
const INT_FIELDS = ['status', 'category', 'replenishType', 'baseUnitRotation', 'stockStatus'];

// Fields that can be blanked: nullable in `location` and not mandatory in the model. `status` and
// `category` are set-only (the model marks them mandatory), and so are the two booleans
// (`replenish`, `allowCycleCountStockMin`: no empty state).
const CLEARABLE_FIELDS = [
    'length',
    'width',
    'height',
    'weight',
    'replenishType',
    'baseUnitRotation',
    'stockStatus',
    'comment'
];

// Fields whose `d:` translation code differs from the column name (the model's displayName).
const LABEL_CODES: Record<string, string> = {
    weight: 'maxWeight'
};

// Store and scope behind each code field. The scopes are the ones the single-record form reads:
// the replenish types are configs, while the rotations and the stock statuses are parameters
// (whatever LocationModelV2 declares for baseUnitRotation).
const CODE_SOURCES: Record<string, { store: 'configs' | 'parameters'; scope: string }> = {
    status: { store: 'configs', scope: 'location_status' },
    category: { store: 'configs', scope: 'location_category' },
    replenishType: { store: 'configs', scope: 'location_replenish_type' },
    baseUnitRotation: { store: 'parameters', scope: 'rotation' },
    stockStatus: { store: 'parameters', scope: 'stock_statuses' }
};

/**
 * Whether the mass update may blank `field`: never a field the model marks mandatory (the
 * single-record form refuses to save without it, and this screen is no back door around that),
 * never a boolean (always set on a location).
 */
const isClearable = (field: string) =>
    CLEARABLE_FIELDS.includes(field) && model.fieldsInfo[field]?.isMandatory !== true;

/**
 * Mass update of the selected locations, through the API's own bulk mutation
 * `updateLocations(ids, input)`, in three sections: general (status, category, stock status,
 * cycle count on minimum stock, comment), replenishment (replenish, replenish type, base unit
 * rotation) and dimensions (length, width, height, maximum weight). All but the status are fields
 * the single-record form (EditLocationForm) edits one location at a time; the status is offered
 * here on purpose (disabling or re-enabling a whole range of locations is the typical mass
 * gesture), with the codes of the `location_status` scope.
 *
 * Same three states per field as EditArticleLusModal: an untouched field (`undefined`) is left
 * alone and not sent; an explicitly blanked one ("clear the field" option, emptied input) is sent
 * as `null` so the value is actually erased, for the fields `isClearable` accepts; anything else
 * is sent as is. A recap confirmation separates the two gestures before anything is sent.
 *
 * The three replenishment fields are kept coherent the way the single-record form keeps them (a
 * replenish type only makes sense on a replenished location, a rotation only with the "Same
 * rotation" type), in both directions and visibly in the form itself:
 *   - replenish set to No blanks the type and the rotation;
 *   - a type chosen sets replenish to Yes, and a type other than "Same rotation" (or a blanked
 *     type) blanks the rotation;
 *   - a rotation chosen sets the type to "Same rotation" and replenish to Yes.
 * `buildInput` applies the same rules to the payload as a safety net, so the recap always shows
 * exactly what is sent.
 */
const EditLocationsRenderModal = ({
    visible,
    showhideModal,
    rows,
    setRefetch,
    setSelectedRowKeys
}: IEditLocationsRenderModalProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const { configs: dbConfigs, parameters: dbParameters } = useAppState();
    const filteredLanguage = getLanguageCode(router);
    const [form] = Form.useForm();
    const [isUpdating, setIsUpdating] = useState(false);
    const errorMessageUpdateData = t('messages:error-update-data');
    const successMessageUpdateData = t('messages:success-updated');

    const labelOf = (field: string) => t(`d:${LABEL_CODES[field] ?? field}`);

    // Code of the "Same rotation" replenish type, the only one a base unit rotation goes with.
    // Read from the configs, never hard-coded; NaN when the config is missing, in which case no
    // type can equal it and any rotation is blanked, like the single-record form would.
    const sameRotationType = useMemo(
        () =>
            parseInt(
                findCodeByScopeAndValue(dbConfigs ?? [], 'location_replenish_type', 'Same rotation')
            ),
        [dbConfigs]
    );

    // Options come from the app-wide config/parameter stores already loaded by AppLayout, so the
    // modal issues no query of its own. Labels are resolved like SelectInput does: the DB
    // translation for the active language, falling back to the raw value. The clearable code
    // fields get a leading "clear the field" option resolving to null, which buildInput turns
    // into an explicit clear; it is labelled rather than blank so the gesture is obvious.
    const codeOptions = useMemo(() => {
        const optionsOf = (field: string) => {
            const { store, scope } = CODE_SOURCES[field];
            const entries = (store === 'configs' ? dbConfigs : dbParameters) ?? [];
            return [
                ...(isClearable(field)
                    ? [
                          <Select.Option key="__clear__" value={null}>
                              {t('actions:clear-field')}
                          </Select.Option>
                      ]
                    : []),
                ...entries
                    .filter((entry: any) => entry.scope === scope)
                    .sort((a: any, b: any) =>
                        isNumeric(a.code) && isNumeric(b.code)
                            ? parseInt(a.code) - parseInt(b.code)
                            : String(a.code).localeCompare(String(b.code))
                    )
                    .map((entry: any) => (
                        <Select.Option
                            key={entry.code}
                            value={!isNumeric(entry.code) ? entry.code : parseInt(entry.code)}
                        >
                            {filteredLanguage &&
                            entry.translation &&
                            entry.translation[filteredLanguage]
                                ? entry.translation[filteredLanguage]
                                : entry.value}
                        </Select.Option>
                    ))
            ];
        };
        return Object.fromEntries(Object.keys(CODE_SOURCES).map((f) => [f, optionsOf(f)]));
    }, [dbConfigs, dbParameters, filteredLanguage, t]);

    const booleanOptions = (
        <>
            <Select.Option value={true}>{t('common:bool-yes')}</Select.Option>
            <Select.Option value={false}>{t('common:bool-no')}</Select.Option>
        </>
    );

    // Keeps the three replenishment fields coherent as the user fills them (see the component
    // comment): the induced changes are made in the form, so the user sees them before the recap.
    // `undefined` puts a field back to "leave alone"; the payload rules in buildInput then blank
    // what has to be blanked.
    const onValuesChange = (changed: Record<string, any>) => {
        if ('replenish' in changed && changed.replenish === false) {
            form.setFieldsValue({ replenishType: undefined, baseUnitRotation: undefined });
        }
        if ('replenishType' in changed) {
            const type = changed.replenishType;
            if (type !== undefined && type !== null) form.setFieldsValue({ replenish: true });
            if (type !== sameRotationType) form.setFieldsValue({ baseUnitRotation: undefined });
        }
        if ('baseUnitRotation' in changed) {
            const rotation = changed.baseUnitRotation;
            if (rotation !== undefined && rotation !== null) {
                form.setFieldsValue({ replenish: true, replenishType: sameRotationType });
            }
        }
    };

    // Three states per field, which is what a mass update needs:
    //   undefined -> untouched, not sent. antd leaves a field undefined until it is used, and the
    //                Select clear icon puts it back to undefined, so "leave alone" stays reachable.
    //   null / '' -> explicitly blanked by the user ("clear the field" option, emptied input):
    //                sent as null so the value is actually erased, for the fields that accept it.
    //   anything else -> sent as is.
    const buildInput = (formData: any) => {
        const input: Record<string, any> = {};
        Object.entries(formData ?? {}).forEach(([key, value]) => {
            if (value === undefined) return;
            if (value === null || (typeof value === 'string' && value.trim() === '')) {
                // A non-clearable field emptied by hand reads as "leave alone", exactly like one
                // that was never touched - dropping the key here is what makes the two identical.
                if (isClearable(key)) input[key] = null;
                return;
            }
            input[key] =
                INT_FIELDS.includes(key) && typeof value === 'string' && isNumeric(value)
                    ? parseInt(value)
                    : value;
        });
        // Replenishment coherence, same rules as EditLocationForm at submit (safety net behind
        // the form-level sync above).
        if (input.baseUnitRotation !== undefined && input.baseUnitRotation !== null) {
            input.replenishType = sameRotationType;
        }
        if (input.replenishType !== undefined && input.replenishType !== null) {
            input.replenish = true;
        }
        if (input.replenish === false) {
            input.replenishType = null;
            input.baseUnitRotation = null;
        } else if (input.replenishType !== undefined && input.replenishType !== sameRotationType) {
            // type set to another value, or blanked: a rotation has no meaning anymore
            input.baseUnitRotation = null;
        }
        return input;
    };

    const updateLocations = async (input: Record<string, any>, ids: string[]) => {
        const mutation = gql`
            mutation updateLocations($ids: [String!]!, $input: UpdateLocationInput!) {
                updateLocations(ids: $ids, input: $input)
            }
        `;
        setIsUpdating(true);
        try {
            const result: any = await graphqlRequestClient.request(mutation, { ids, input });
            // updateLocations answers a bare Boolean. A rejected update throws (the API raises a
            // GraphQL error), but a plain `false` would otherwise read as success and the modal
            // would close on an update that never happened. Only `true` counts.
            if (result?.updateLocations !== true) {
                showError(errorMessageUpdateData);
                return;
            }
            showSuccess(successMessageUpdateData);
            form.resetFields();
            setSelectedRowKeys([]);
            setRefetch();
            showhideModal();
        } catch (error) {
            console.log('Error in updateLocations', error);
            showError(errorMessageUpdateData);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancel = () => {
        showhideModal();
        form.resetFields();
    };

    const onClickOk = () => {
        form.validateFields()
            .then(() => {
                const input = buildInput(form.getFieldsValue(true));
                const ids: string[] = rows?.selectedRowKeys ?? [];
                const fieldNames = Object.keys(input);

                if (fieldNames.length === 0) {
                    showError(t('messages:no-data-to-update'));
                    return;
                }

                const clearedNames = fieldNames.filter((name) => input[name] === null);
                const setNames = fieldNames.filter((name) => input[name] !== null);

                Modal.confirm({
                    title: t('messages:action-confirm'),
                    content: (
                        <>
                            <div>{t('messages:selected-items-number', { number: ids.length })}</div>
                            {setNames.length > 0 && (
                                <div>
                                    {t('actions:edit')} : {setNames.map(labelOf).join(', ')}
                                </div>
                            )}
                            {clearedNames.length > 0 && (
                                <div>
                                    {t('actions:clear-field')} :{' '}
                                    {clearedNames.map(labelOf).join(', ')}
                                </div>
                            )}
                        </>
                    ),
                    okText: t('messages:confirm'),
                    cancelText: t('messages:cancel'),
                    onOk: () => updateLocations(input, ids)
                });
            })
            .catch(() => {
                showError(errorMessageUpdateData);
            });
    };

    const gutter = { xs: 8, sm: 16, md: 24, lg: 32 };

    return (
        <Modal
            title={t('actions:edit-locations')}
            open={visible}
            onOk={onClickOk}
            onCancel={handleCancel}
            confirmLoading={isUpdating}
            width="60vw"
            destroyOnClose
        >
            <Text type="secondary">{t('messages:mass-update-hint')}</Text>
            <Divider style={{ margin: '12px 0' }} />
            <Form form={form} layout="vertical" scrollToFirstError onValuesChange={onValuesChange}>
                {/* Section titles reuse the detail pages' group labels (common:general,
                    common:dimensions) and the replenish field label for the replenishment one. */}
                <Divider orientation="left" style={{ marginTop: 0 }}>
                    {t('common:general')}
                </Divider>
                <Row gutter={gutter}>
                    <Col xs={24} md={8}>
                        <Form.Item label={labelOf('status')} name="status">
                            <Select allowClear>{codeOptions.status}</Select>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item label={labelOf('category')} name="category">
                            <Select allowClear>{codeOptions.category}</Select>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item label={labelOf('stockStatus')} name="stockStatus">
                            <Select allowClear>{codeOptions.stockStatus}</Select>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        {/* Three-state on purpose: leaving it untouched means "leave alone". A
                            plain Checkbox always carries a value and would rewrite the field on
                            every selected location. Same for replenish below. */}
                        <Form.Item
                            label={labelOf('allowCycleCountStockMin')}
                            name="allowCycleCountStockMin"
                        >
                            <Select allowClear>{booleanOptions}</Select>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={16}>
                        <Form.Item label={labelOf('comment')} name="comment">
                            <Input.TextArea rows={2} />
                        </Form.Item>
                    </Col>
                </Row>
                <Divider orientation="left">{labelOf('replenish')}</Divider>
                <Row gutter={gutter}>
                    <Col xs={24} md={8}>
                        <Form.Item label={labelOf('replenish')} name="replenish">
                            <Select allowClear>{booleanOptions}</Select>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item label={labelOf('replenishType')} name="replenishType">
                            <Select allowClear>{codeOptions.replenishType}</Select>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item label={labelOf('baseUnitRotation')} name="baseUnitRotation">
                            <Select allowClear>{codeOptions.baseUnitRotation}</Select>
                        </Form.Item>
                    </Col>
                </Row>
                <Divider orientation="left">{t('common:dimensions')}</Divider>
                <Row gutter={gutter}>
                    <Col xs={24} md={6}>
                        <Form.Item label={labelOf('length')} name="length">
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                        <Form.Item label={labelOf('width')} name="width">
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                        <Form.Item label={labelOf('height')} name="height">
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                        <Form.Item label={labelOf('weight')} name="weight">
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};

export { EditLocationsRenderModal };
