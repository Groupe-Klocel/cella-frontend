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
    ArticleLuModelV2 as model,
    getLanguageCode,
    isNumeric,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import {
    Checkbox,
    Col,
    Divider,
    Form,
    Input,
    InputNumber,
    Modal,
    Row,
    Select,
    Typography
} from 'antd';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import AutoComplete from '../../../components/common/smart/Form/MainInputs/AutoCompleteInput';
import { askToReestimateDeliveries } from '../../../helpers/utils/reestimateDeliveries';
import configs from '../../../../common/configs.json';

const { Text } = Typography;

export interface IEditArticleLusRenderModalProps {
    visible: boolean;
    rows: any;
    showhideModal: () => void;
    setRefetch: () => void;
    setSelectedRowKeys: (keys: any[]) => void;
}

// Fields holding a config/parameter code: the API expects an Int.
const INT_FIELDS = ['status', 'preparationMode', 'pickingType', 'sortType', 'rotation'];

// NOT NULL in article_lu (`describe_model` flags them `required`): blanking one of these can only
// fail at the database. Listed explicitly rather than inferred, so the floor holds even if an
// upstream release ever stops marking them mandatory in the model.
const DB_NOT_NULL = ['name', 'status'];

/**
 * Whether the mass update may blank `field`.
 *
 * A field the model marks mandatory is never blanked: the single-record add/edit form refuses to
 * save without it, and this screen must not become a back door around that rule. It matters beyond
 * `name`/`status`, which the database would reject anyway - `quantity` and the four dimension
 * fields are nullable in `article_lu`, so blanking them would silently succeed and leave records
 * the single-record form can no longer save (and cubing can no longer compute).
 *
 * Reading the flag off the model rather than hard-coding a list means a field upstream makes
 * mandatory later is covered without touching this file.
 */
const isClearable = (field: string) =>
    !DB_NOT_NULL.includes(field) && model.fieldsInfo[field]?.isMandatory !== true;

// Fields whose `d:` translation code differs from the field name (no d:pickingLocationId row).
const LABEL_CODES: Record<string, string> = {
    pickingLocationId: 'pickingLocation'
};

/**
 * The four entity pickers, rendered by the shared AutoCompleteInput.
 *
 * They cannot offer the "clear the field" option the Selects carry: AutoCompleteInput owns its own
 * `Form.Item`, builds its dropdown from the rows it fetched, and normalizes an empty selection to
 * `undefined` - which `buildInput` reads as "leave alone". And since a mass-update modal prefills
 * nothing, the picker is always empty, so antd shows no clear icon and there is no selection to
 * undo in the first place. Slipping the option into its dropdown would mean forking a component
 * every model-driven form uses, for a need that is specific to this screen.
 *
 * Each picker therefore carries its own checkbox, which makes the same promise explicitly.
 */
const PICKER_FIELDS = [
    'handlingUnitModelId',
    'pickingLocationId',
    'automaticPickingLocationPatternId',
    'automaticStorageLocationPatternId'
];

// Namespaces the checkbox form fields so they cannot collide with a real column name.
const CLEAR_PREFIX = 'clearField_';

/**
 * Mass update of the selected packagings, through the API's own bulk mutation
 * `updateArticleLus(ids, input)`.
 *
 * Two differences with EditArticlesModal, both deliberate:
 *
 *  1. Three states per field instead of two. EditArticlesModal submits `form.getFieldsValue(true)`,
 *     and a Checkbox always carries a value - so every mass edit silently rewrites the booleans,
 *     including the ones the user never touched. Here `buildInput` reads an untouched field
 *     (`undefined`) as "leave alone" and an explicitly blanked one (`null` from the leading "clear
 *     the field" option, or an emptied input) as "erase it", sending `null`. `replenish` is a
 *     three-state Select rather than a Checkbox for the same reason. `isClearable` decides which
 *     fields accept the blanking gesture at all: a field the model marks mandatory never does.
 *  2. A recap confirmation before sending, which separates the two gestures ("Edit: ... / Clear the
 *     field: ..."): `name` and `quantity` identify the packaging and a mass overwrite of those is
 *     not something one undoes easily.
 */
const EditArticleLusRenderModal = ({
    visible,
    showhideModal,
    rows,
    setRefetch,
    setSelectedRowKeys
}: IEditArticleLusRenderModalProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const { configs: dbConfigs, parameters } = useAppState();
    const filteredLanguage = getLanguageCode(router);
    const [form] = Form.useForm();
    const [isUpdating, setIsUpdating] = useState(false);
    const errorMessageUpdateData = t('messages:error-update-data');
    const successMessageUpdateData = t('messages:success-updated');

    const labelOf = (field: string) => t(`d:${LABEL_CODES[field] ?? field}`);

    // Watching the whole form is enough here and keeps the hook count static: the checkboxes only
    // drive the disabled state of their own picker.
    const watchedValues = Form.useWatch([], form) ?? {};
    const isCleared = (field: string) => watchedValues[`${CLEAR_PREFIX}${field}`] === true;

    // Dropdown sources come from the app-wide config/parameter stores already loaded by AppLayout,
    // so the modal issues no query of its own. Beware of the split: `article_lu_status` is a
    // config, while preparation_mode / picking_type / stock_sort_type / rotation are parameters.
    const scopedOptions = useMemo(() => {
        const byScope = (list: any, scope: string) =>
            (list ?? []).filter((entry: any) => entry.scope === scope);

        return {
            statuses: byScope(dbConfigs, 'article_lu_status'),
            preparationModes: byScope(parameters, 'preparation_mode'),
            pickingTypes: byScope(parameters, 'picking_type'),
            sortTypes: byScope(parameters, 'stock_sort_type'),
            rotations: byScope(parameters, 'rotation')
        };
    }, [dbConfigs, parameters]);

    // The option tables are read off the model so that the pickers stay aligned with the entity
    // definition (and with any modelsSpe override) instead of hard-coding table names here.
    const autoCompleteItem = (field: string, extraOptionTable?: Record<string, any>) => {
        const raw = model.fieldsInfo[field]?.optionTable;
        return {
            name: field,
            displayName: labelOf(field),
            // Checking "clear the field" locks the picker, so the payload can never carry a value
            // and a clear for the same column.
            disabled: isCleared(field),
            optionTable: { ...(raw ? JSON.parse(raw) : {}), ...(extraOptionTable ?? {}) }
        };
    };

    /** A picker plus the checkbox that blanks the column, since its dropdown cannot host one. */
    const picker = (field: string, extraOptionTable?: Record<string, any>) => (
        <div key={field}>
            <AutoComplete key={field} item={autoCompleteItem(field, extraOptionTable) as any} />
            {isClearable(field) ? (
                <Form.Item
                    name={`${CLEAR_PREFIX}${field}`}
                    valuePropName="checked"
                    style={{ marginTop: -18 }}
                >
                    <Checkbox>{t('actions:clear-field')}</Checkbox>
                </Form.Item>
            ) : null}
        </div>
    );

    // The leading option resolves to null, which buildInput turns into an explicit clear. It is
    // labelled rather than blank so the gesture is obvious, and it is left out of the fields
    // `isClearable` rejects. Option labels are resolved exactly like SelectInput does: the DB
    // translation for the active language, falling back to the raw value.
    const codeOptions = (list: any[], field: string) => [
        ...(isClearable(field)
            ? [
                  <Select.Option key="__clear__" value={null}>
                      {t('actions:clear-field')}
                  </Select.Option>
              ]
            : []),
        ...[...list]
            // A non-numeric code is kept as-is below, so the comparator must cope with one:
            // parseInt on it yields NaN, and a comparator returning NaN leaves the order undefined.
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
                    {filteredLanguage && entry.translation && entry.translation[filteredLanguage]
                        ? entry.translation[filteredLanguage]
                        : entry.value}
                </Select.Option>
            ))
    ];

    // Three states per field, which is what a mass update needs:
    //   undefined -> untouched, not sent. antd leaves a field undefined until it is used, and the
    //                Select clear icon puts it back to undefined, so "leave alone" stays reachable.
    //   null / '' -> explicitly blanked by the user ("clear the field" option, emptied input):
    //                sent as null so the value is actually erased.
    //   anything else -> sent as is.
    const buildInput = (formData: any) => {
        const input: Record<string, any> = {};
        Object.entries(formData ?? {}).forEach(([key, value]) => {
            // The clear checkboxes are UI state, not columns - applied below, never sent as keys.
            if (key.startsWith(CLEAR_PREFIX)) return;
            if (value === undefined) return;
            if (value === null || (typeof value === 'string' && value.trim() === '')) {
                // A mandatory field emptied by hand reads as "leave alone", exactly like one that
                // was never touched - dropping the key here is what makes the two identical.
                if (isClearable(key)) input[key] = null;
                return;
            }
            // codeOptions keeps a non-numeric config code as a string (same rule as SelectInput),
            // so parsing every string here would turn such a code into NaN. Only coerce what is
            // actually numeric; the dropdowns already yield a number in the common case.
            input[key] =
                INT_FIELDS.includes(key) && typeof value === 'string' && isNumeric(value)
                    ? parseInt(value)
                    : value;
        });
        // A ticked checkbox blanks its column. Applied after the loop so it wins over anything the
        // picker might still hold; in practice it cannot hold a value, since ticking disables it.
        PICKER_FIELDS.forEach((field) => {
            if (formData?.[`${CLEAR_PREFIX}${field}`] === true && isClearable(field)) {
                input[field] = null;
            }
        });
        return input;
    };

    /**
     * The deliveries to re-pack are keyed by article, not by packaging, so the articles of the
     * packagings that were just updated have to be resolved first. Offered after the update, never
     * before: nothing is re-packed for a change that did not go through.
     */
    const offerReestimate = async (packagingIds: string[]) => {
        if (packagingIds.length === 0) return;
        const query = gql`
            query articlesOfPackagings($filters: ArticleLuSearchFilters, $itemsPerPage: Int!) {
                articleLus(filters: $filters, itemsPerPage: $itemsPerPage) {
                    results {
                        articleId
                    }
                }
            }
        `;
        try {
            const result: any = await graphqlRequestClient.request(query, {
                filters: { id: packagingIds },
                itemsPerPage: packagingIds.length
            });
            await askToReestimateDeliveries({
                graphqlRequestClient,
                configs: dbConfigs ?? [],
                t,
                articleIds: (result?.articleLus?.results ?? []).map((row: any) => row.articleId)
            });
        } catch (error) {
            // The packagings were updated. Failing to offer the follow-up is not a failed update,
            // and surfacing it as one would be worse than not asking.
        }
    };

    const updateArticleLus = async (input: Record<string, any>, ids: string[]) => {
        const mutation = gql`
            mutation updateArticleLus($ids: [String!]!, $input: UpdateArticleLuInput!) {
                updateArticleLus(ids: $ids, input: $input)
            }
        `;
        setIsUpdating(true);
        let updated = false;
        try {
            const result: any = await graphqlRequestClient.request(mutation, { ids, input });
            // updateArticleLus answers a bare Boolean. A rejected update throws (the API raises a
            // GraphQL error), but a plain `false` would otherwise read as success and the modal
            // would close on an update that never happened. Only `true` counts.
            if (result?.updateArticleLus !== true) {
                showError(errorMessageUpdateData);
                return;
            }
            showSuccess(successMessageUpdateData);
            form.resetFields();
            setSelectedRowKeys([]);
            setRefetch();
            showhideModal();
            updated = true;
        } catch (error) {
            showError(errorMessageUpdateData);
        } finally {
            setIsUpdating(false);
        }
        // Outside the try on purpose: an error raised while offering the follow-up must not be
        // reported as a failed update, since the update has already succeeded at this point.
        if (updated) await offerReestimate(ids);
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
                    onOk: () => updateArticleLus(input, ids)
                });
            })
            .catch(() => {
                showError(errorMessageUpdateData);
            });
    };

    return (
        <Modal
            title={t('actions:edit-article-lus')}
            open={visible}
            onOk={onClickOk}
            onCancel={handleCancel}
            confirmLoading={isUpdating}
            width="80vw"
            destroyOnClose
        >
            <Text type="secondary">{t('messages:mass-update-hint')}</Text>
            <Divider style={{ margin: '12px 0' }} />
            <Form form={form} layout="vertical" scrollToFirstError>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={24} md={12} xl={5}>
                        <Form.Item label={labelOf('name')} name="name">
                            <Input />
                        </Form.Item>
                        <Form.Item label={labelOf('quantity')} name="quantity">
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item label={labelOf('description')} name="description">
                            <Input />
                        </Form.Item>
                        <Form.Item label={labelOf('status')} name="status">
                            <Select allowClear>
                                {codeOptions(scopedOptions.statuses, 'status')}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12} xl={5}>
                        <Form.Item label={labelOf('length')} name="length">
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item label={labelOf('width')} name="width">
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item label={labelOf('height')} name="height">
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item label={labelOf('baseUnitWeight')} name="baseUnitWeight">
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12} xl={5}>
                        <Form.Item label={labelOf('preparationMode')} name="preparationMode">
                            <Select allowClear>
                                {codeOptions(scopedOptions.preparationModes, 'preparationMode')}
                            </Select>
                        </Form.Item>
                        <Form.Item label={labelOf('pickingType')} name="pickingType">
                            <Select allowClear>
                                {codeOptions(scopedOptions.pickingTypes, 'pickingType')}
                            </Select>
                        </Form.Item>
                        <Form.Item label={labelOf('sortType')} name="sortType">
                            <Select allowClear>
                                {codeOptions(scopedOptions.sortTypes, 'sortType')}
                            </Select>
                        </Form.Item>
                        <Form.Item label={labelOf('rotation')} name="rotation">
                            <Select allowClear>
                                {codeOptions(scopedOptions.rotations, 'rotation')}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12} xl={4}>
                        {/* Three-state on purpose: leaving it untouched means "leave alone". A
                            plain Checkbox always carries a value and would rewrite the field.
                            Options are built by hand rather than from a scope, so the clearing one
                            goes through isClearable here too. */}
                        <Form.Item label={labelOf('replenish')} name="replenish">
                            <Select allowClear>
                                {isClearable('replenish') ? (
                                    <Select.Option value={null}>
                                        {t('actions:clear-field')}
                                    </Select.Option>
                                ) : null}
                                <Select.Option value={true}>{t('common:bool-yes')}</Select.Option>
                                <Select.Option value={false}>{t('common:bool-no')}</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            label={labelOf('minimumReplenishmentThreshold')}
                            name="minimumReplenishmentThreshold"
                        >
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                            label={labelOf('maximumReplenishmentThreshold')}
                            name="maximumReplenishmentThreshold"
                        >
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                            label={labelOf('expansionCoefficient')}
                            name="expansionCoefficient"
                        >
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item label={labelOf('emptyCoefficient')} name="emptyCoefficient">
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12} xl={5}>
                        {picker('handlingUnitModelId')}
                        {picker('pickingLocationId', {
                            // narrowed on the API side, same rule as the LU add/edit form
                            filtersToApply: {
                                category: configs.LOCATION_CATEGORY_PICKING
                            },
                            advancedFilters: [
                                {
                                    filter: [
                                        {
                                            searchType: 'DIFFERENT',
                                            field: {
                                                status: configs.LOCATION_STATUS_DISABLED
                                            }
                                        }
                                    ]
                                }
                            ]
                        })}
                        {picker('automaticPickingLocationPatternId')}
                        {picker('automaticStorageLocationPatternId')}
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};

export { EditArticleLusRenderModal };
