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
//DESCRIPTION: select a content among a list of ContentFeatures corresponding to a given article and a given location

import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { WrapperForm, WrapperSlide, RadioButtons, ContentSpin } from '@components';
import { getLastStepWithPreviousStep } from '@helpers';
import { Button, Carousel, Col, Divider, Form, Row, Typography } from 'antd';
import Text from 'antd/lib/typography/Text';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';

const { Title } = Typography;
export interface ISelectContentForFeatureReducerProps {
    processName: string;
    stepNumber: number;
    buttons?: { [label: string]: any };
    articleId: string;
    locationId?: string;
    hideSelect?: boolean;
    uniqueId: string;
}

const StyledTitle = styled(Title)`
    margin: 0 !important;
`;

const SmallStyledButton = styled(Button)`
    background-color: #f4a261 !important;
    box-shadow: inset 0px 1px 0px 0px #f9eca0 !important;
    background: radial-gradient(circle, #f5c73d 70%, #f4a261 100%) !important;
    border: 1px solid #f5c73d !important;
    color: #000000 !important;
    position: absolute !important;
    bottom: 25px;
    font-size: 10px !important;
`;

const CarouselWrapper = styled(Carousel)`
    width: 90%;
    min-height: 130px;
    margin: auto;
    padding-bottom: 5px;
    > .slick-dots-bottom {
        bottom: 2px !important;
    }
    > .slick-dots li button {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: linear-gradient(to bottom, #f4a261 5%, #f5c73d 100%) !important;
    }
`;

export const SelectContentForFeatureForm_reducer = ({
    processName,
    stepNumber,
    buttons,
    articleId,
    locationId,
    hideSelect,
    uniqueId
}: ISelectContentForFeatureReducerProps) => {
    const { t } = useTranslation('common');
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const { graphqlRequestClient } = useAuth();

    const [data, setData] = useState<any>();

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, []);

    const handlingUnitContentFeaturesQuery = gql`
        query GetHandlingUnitContentFeatures(
            $filters: HandlingUnitContentFeatureSearchFilters
            $orderBy: [HandlingUnitContentFeatureOrderByCriterion!]
            $page: Int!
            $itemsPerPage: Int!
            $language: String = "en"
        ) {
            handlingUnitContentFeatures(
                filters: $filters
                orderBy: $orderBy
                page: $page
                itemsPerPage: $itemsPerPage
                language: $language
            ) {
                count
                itemsPerPage
                totalPages
                results {
                    id
                    extraStatus1
                    value
                    featureCodeId
                    featureCode {
                        id
                        name
                        unique
                    }
                    handlingUnitContentId
                    handlingUnitContent {
                        id
                        stockStatus
                        stockStatusText
                        reservation
                        quantity
                        handlingUnitId
                        stockOwnerId
                        stockOwner {
                            id
                            name
                        }
                        handlingUnit {
                            id
                            name
                            category
                            locationId
                            location {
                                id
                                name
                                category
                                categoryText
                                block {
                                    name
                                }
                            }
                            stockOwnerId
                            stockOwner {
                                id
                                name
                            }
                            parentHandlingUnitId
                            parentHandlingUnit {
                                id
                                name
                            }
                        }
                        articleId
                        article {
                            id
                            name
                            stockOwnerId
                        }
                        handlingUnitContentFeatures {
                            id
                            value
                            featureCodeId
                            featureCode {
                                id
                                name
                                unique
                            }
                        }
                    }
                }
            }
        }
    `;

    //SelectContentForFeature-1: query ContentFeatures matching the scanned unique value
    useEffect(() => {
        const variables = {
            filters: { value: uniqueId },
            page: 1,
            itemsPerPage: 100
        };
        graphqlRequestClient
            .request(handlingUnitContentFeaturesQuery, variables)
            .then((result: any) => {
                setData(result);
            });
    }, [uniqueId]);

    //SelectContentForFeature-2: set ContentFeatures to provide to carousel
    const [contentFeatures, setContentFeatures] = useState<any>([]);
    useEffect(() => {
        if (data) {
            if (data?.handlingUnitContentFeatures) {
                setContentFeatures(data?.handlingUnitContentFeatures?.results);
            }
        }
    }, [data]);

    //SelectContentForFeature-3Auto: automatically set stored chosenContent when only one content is present
    useEffect(() => {
        if (contentFeatures.length == 1) {
            const dynamicStepNumber = getLastStepWithPreviousStep(storedObject);
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: {
                    ...storedObject[`step${stepNumber}`],
                    data: { chosenContent: contentFeatures[0].handlingUnitContent }
                },
                customFields: [{ key: 'currentStep', value: dynamicStepNumber }]
            });
        }
    }, [contentFeatures]);

    //SelectContentForFeature-3: set stored chosenContent once select button is pushed
    const [chosenContent, setChosenContent] = useState<any>();
    useEffect(() => {
        if (chosenContent) {
            const data: { [label: string]: any } = {};
            data['chosenContent'] = contentFeatures.find(
                (e: any) => e.id === chosenContent
            )?.handlingUnitContent;
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: { ...storedObject[`step${stepNumber}`], data },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, [chosenContent]);

    //SelectContentForFeature-3b: handle back to previous step settings
    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName,
            stepToReturn: `step${storedObject[`step${stepNumber}`].previousStep}`
        });
    };

    return (
        <WrapperForm>
            {data ? (
                <CarouselWrapper
                    arrows
                    prevArrow={<LeftOutlined />}
                    nextArrow={<RightOutlined />}
                    style={{ maxWidth: '95%' }}
                >
                    {contentFeatures && contentFeatures.length >= 1 ? (
                        contentFeatures.map((content: any, index: number, array: any) => (
                            <WrapperSlide key={content.id}>
                                <StyledTitle level={5}>
                                    {t('common:content')} {index + 1}/{array.length}
                                </StyledTitle>
                                <Divider style={{ margin: 2 }} />
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:handling-unit-parent_abbr')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {
                                                content.handlingUnitContent?.handlingUnit
                                                    ?.parentHandlingUnit?.name
                                            }
                                        </Typography>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:handling-unit_abbr')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {content.handlingUnitContent?.handlingUnit?.name}
                                        </Typography>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:stock-owner')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {
                                                content.handlingUnitContent?.handlingUnit
                                                    ?.stockOwner?.name
                                            }
                                        </Typography>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:quantity')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {content.handlingUnitContent?.quantity
                                                ? content.handlingUnitContent.quantity
                                                : 1}
                                        </Typography>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:stock-status')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {content.handlingUnitContent?.stockStatusText}
                                        </Typography>
                                    </Col>
                                </Row>
                                {!hideSelect ? (
                                    <></>
                                ) : (
                                    <Row>
                                        <Col span={8}>
                                            <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                                {t('common:location')}:
                                            </Typography>
                                        </Col>
                                        <Col span={16}>
                                            <Typography style={{ fontSize: '10px' }}>
                                                {
                                                    content?.handlingUnitContent?.handlingUnit
                                                        ?.location?.name
                                                }
                                            </Typography>
                                        </Col>
                                    </Row>
                                )}
                                {!hideSelect ? (
                                    <></>
                                ) : (
                                    <Row>
                                        <Col span={8}>
                                            <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                                {t('common:category')}:
                                            </Typography>
                                        </Col>
                                        <Col span={16}>
                                            <Typography style={{ fontSize: '10px' }}>
                                                {
                                                    content?.handlingUnitContent?.handlingUnit
                                                        ?.location?.categoryText
                                                }
                                            </Typography>
                                        </Col>
                                    </Row>
                                )}
                                {!hideSelect ? (
                                    <Form
                                        name="basic"
                                        layout="vertical"
                                        onFinish={() => {
                                            setChosenContent(content.id);
                                        }}
                                        autoComplete="off"
                                        scrollToFirstError
                                        size="small"
                                    >
                                        <Row justify="end">
                                            <SmallStyledButton
                                                block
                                                style={{ height: '20px', width: '50vw' }}
                                                htmlType="submit"
                                            >
                                                {t('actions:select')}
                                            </SmallStyledButton>
                                        </Row>
                                    </Form>
                                ) : (
                                    <></>
                                )}
                            </WrapperSlide>
                        ))
                    ) : (
                        <Text type="warning">{t('messages:no-content')}</Text>
                    )}
                </CarouselWrapper>
            ) : (
                <ContentSpin />
            )}
            <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
        </WrapperForm>
    );
};
